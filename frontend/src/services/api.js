import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/residents';

const DEFAULT_RESIDENTS = [];

const getLocalResidents = () => {
  const local = localStorage.getItem('gatepass_residents');
  if (!local) {
    localStorage.setItem('gatepass_residents', JSON.stringify(DEFAULT_RESIDENTS));
    return DEFAULT_RESIDENTS;
  }
  return JSON.parse(local);
};

const saveLocalResidents = (residents) => {
  localStorage.setItem('gatepass_residents', JSON.stringify(residents));
};

const addLocalNotification = (notification) => {
  const list = JSON.parse(localStorage.getItem('gatepass_notifications') || '[]');
  const newNotif = {
    ...notification,
    _id: 'mock-notif-' + Math.random().toString(36).substr(2, 9),
    isRead: false,
    createdAt: new Date().toISOString()
  };
  list.push(newNotif);
  localStorage.setItem('gatepass_notifications', JSON.stringify(list));
  window.dispatchEvent(new Event('mock_notification_sent'));
  return newNotif;
};

export const residentApi = {
  login: async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, { email, password });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Server error');
      }
      console.warn('Backend offline, logging in locally:', error.message);
      const list = getLocalResidents();
      const matched = list.find(r => {
        const firstName = r.name.trim().split(' ')[0].toLowerCase();
        const flatClean = r.flatNo.toLowerCase().replace(/[^a-z0-9]/g, '');
        const expectedEmail = `${firstName}.${flatClean}@gatepass.com`;
        return email.trim().toLowerCase() === expectedEmail || r.email.toLowerCase() === email.trim().toLowerCase();
      });
      if (matched && matched.password === password) {
        const responseObj = { ...matched };
        delete responseObj.password;
        return { resident: responseObj };
      }
      throw new Error('Access Denied. Check email or password.');
    }
  },

  bulkCreate: async (residents) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/bulk`, { residents });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Server error');
      }
      console.warn('Backend offline, saving bulk to LocalStorage:', error.message);
      const list = getLocalResidents();
      const created = [];
      const errors = [];
      for (const r of residents) {
        const existingGmail = list.find(res => res.gmail.toLowerCase() === r.gmail.trim().toLowerCase());
        if (existingGmail) {
          errors.push(`Flat ${r.flatNo}: Gmail ${r.gmail} already exists`);
          continue;
        }
        const existingFlat = list.find(res => res.flatNo.toLowerCase() === r.flatNo.trim().toLowerCase());
        if (existingFlat) {
          errors.push(`Flat ${r.flatNo}: Flat already registered`);
          continue;
        }
        const firstName = r.name.trim().split(' ')[0].toLowerCase();
        const flatClean = r.flatNo.toLowerCase().replace(/[^a-z0-9]/g, '');
        const generatedEmail = `${firstName}.${flatClean}@gatepass.com`;
        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const newRes = {
          ...r,
          email: generatedEmail,
          status: 'Approved',
          otp: generatedOtp,
          password: 'resident123',
          isFirstLogin: true,
          communityId: Math.floor(10000 + Math.random() * 90000).toString(),
          bio: 'Resident of GatePass Pro Community.',
          location: 'GatePass Residency',
          address: `Flat ${r.flatNo}, GatePass Residency`,
          _id: 'mock-' + Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString()
        };
        list.push(newRes);
        created.push(newRes);
      }
      saveLocalResidents(list);
      if (errors.length > 0 && created.length === 0) {
        throw new Error(errors.join('; '));
      }
      return {
        message: `Successfully imported ${created.length} residents.`,
        createdCount: created.length,
        errors: errors.length > 0 ? errors : undefined
      };
    }
  },

  getAll: async (searchQuery = '') => {
    try {
      const response = await axios.get(`${API_BASE_URL}`, {
        params: { search: searchQuery }
      });
      return response.data;
    } catch (error) {
      console.warn('Backend offline, using LocalStorage fallback:', error.message);
      let list = getLocalResidents();
      if (searchQuery) {
        const regex = new RegExp(searchQuery, 'i');
        list = list.filter(r => regex.test(r.name) || regex.test(r.flatNo));
      }
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  },

  create: async (residentData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}`, residentData);
      const created = response.data;
      return created;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Server error');
      }
      console.warn('Backend offline, saving to LocalStorage:', error.message);
      const list = getLocalResidents();
      const existingGmail = list.find(r => r.gmail.toLowerCase() === residentData.gmail.trim().toLowerCase());
      if (existingGmail) {
        throw new Error('A resident with this Gmail address already exists');
      }
      const existingFlat = list.find(r => r.flatNo.toLowerCase() === residentData.flatNo.trim().toLowerCase());
      if (existingFlat) {
        throw new Error('A resident is already registered for this flat');
      }
      const firstName = residentData.name.trim().split(' ')[0].toLowerCase();
      const flatClean = residentData.flatNo.toLowerCase().replace(/[^a-z0-9]/g, '');
      const generatedEmail = `${firstName}.${flatClean}@gatepass.com`;
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

      const newResident = {
        ...residentData,
        email: generatedEmail,
        status: 'Pending',
        otp: generatedOtp,
        password: 'resident123',
        isFirstLogin: true,
        communityId: Math.floor(10000 + Math.random() * 90000).toString(),
        bio: 'Resident of GatePass Pro Community.',
        location: 'GatePass Residency',
        address: `Flat ${residentData.flatNo}, GatePass Residency`,
        _id: 'mock-' + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString()
      };
      
      list.push(newResident);
      saveLocalResidents(list);
      return newResident;
    }
  },

  update: async (id, residentData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/${id}`, residentData);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Server error');
      }
      console.warn('Backend offline, updating in LocalStorage:', error.message);
      const list = getLocalResidents();
      const index = list.findIndex(r => r._id === id);
      if (index !== -1) {
        if (residentData.gmail) {
          const formattedGmail = residentData.gmail.trim().toLowerCase();
          if (formattedGmail !== list[index].gmail.trim().toLowerCase()) {
            const existingGmail = list.find(r => r.gmail.toLowerCase() === formattedGmail);
            if (existingGmail) {
              throw new Error('A resident with this Gmail address already exists');
            }
          }
        }
        if (residentData.currentPassword && residentData.newPassword) {
          if (list[index].password !== residentData.currentPassword) {
            throw new Error('Incorrect current password');
          }
          list[index].password = residentData.newPassword;
          list[index].isFirstLogin = false;
        } else if (residentData.password && residentData.otp) {
          if (list[index].otp !== residentData.otp) {
            throw new Error('Invalid verification OTP');
          }
          list[index].password = residentData.password;
          list[index].isFirstLogin = false;
          list[index].otp = '';
        } else {
          if (residentData.distressMessage) {
            if (!list[index].distressMessages) {
              list[index].distressMessages = [];
            }
            const msgSender = residentData.sender || 'resident';
            list[index].distressMessages.push({
              message: residentData.distressMessage,
              sender: msgSender,
              createdAt: new Date().toISOString(),
              _id: 'msg-' + Math.random().toString(36).substr(2, 9)
            });
            addLocalNotification({
              recipient: msgSender === 'admin' ? list[index].flatNo : 'admin',
              title: msgSender === 'admin' ? 'New Distress Response' : 'Distress Alert Received',
              message: msgSender === 'admin' ? `Admin replied: "${residentData.distressMessage}"` : `${list[index].name} (Flat ${list[index].flatNo}) distress: "${residentData.distressMessage}"`,
              type: 'distress_reply'
            });
          }
          list[index] = { ...list[index], ...residentData };
        }
        saveLocalResidents(list);
        return list[index];
      }
      throw new Error('Resident not found in local storage');
    }
  },

  delete: async (id) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Server error');
      }
      console.warn('Backend offline, deleting from LocalStorage:', error.message);
      const list = getLocalResidents();
      const filtered = list.filter(r => r._id !== id);
      saveLocalResidents(filtered);
      return { message: 'Resident removed successfully from local storage' };
    }
  },

  resendOtp: async (id) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/${id}/resend-otp`);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Server error');
      }
      console.warn('Backend offline, generating new OTP locally:', error.message);
      const list = getLocalResidents();
      const index = list.findIndex(r => r._id === id);
      if (index !== -1) {
        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        list[index].otp = generatedOtp;
        saveLocalResidents(list);
        return { message: 'New OTP sent successfully', otp: generatedOtp };
      }
      throw new Error('Resident not found in local storage');
    }
  },

  forgotPassword: async (email) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/forgot-password`, { email });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Server error');
      }
      console.warn('Backend offline, calling forgotPassword locally:', error.message);
      const list = getLocalResidents();
      const matched = list.find(r => r.email.toLowerCase() === email.trim().toLowerCase() || r.gmail.toLowerCase() === email.trim().toLowerCase());
      if (matched) {
        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        matched.otp = generatedOtp;
        saveLocalResidents(list);
        return { message: 'Verification OTP sent to your registered Gmail address', otp: generatedOtp };
      }
      throw new Error('Resident not found with this email');
    }
  },

  resetForgotPassword: async (email, otp, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/reset-password`, { email, otp, password });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Server error');
      }
      console.warn('Backend offline, resetting password locally:', error.message);
      const list = getLocalResidents();
      const matched = list.find(r => r.email.toLowerCase() === email.trim().toLowerCase() || r.gmail.toLowerCase() === email.trim().toLowerCase());
      if (matched) {
        if (matched.otp !== otp.trim()) {
          throw new Error('Invalid verification OTP');
        }
        matched.password = password;
        matched.isFirstLogin = false;
        matched.otp = '';
        saveLocalResidents(list);
        return matched;
      }
      throw new Error('Resident not found');
    }
  }
};

const VISITOR_API_BASE_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/residents', '/visitors') : 'http://localhost:5000/api/visitors';

const getLocalVisitors = () => {
  const local = localStorage.getItem('gatepass_visitors');
  if (!local) return [];
  return JSON.parse(local);
};

const saveLocalVisitors = (visitors) => {
  localStorage.setItem('gatepass_visitors', JSON.stringify(visitors));
};

export const visitorApi = {
  getAll: async (params = {}) => {
    try {
      const response = await axios.get(VISITOR_API_BASE_URL, { params });
      return response.data;
    } catch (error) {
      console.warn('Backend offline, using LocalStorage fallback for visitors:', error.message);
      let list = getLocalVisitors();
      if (params.flatNo) {
        list = list.filter(v => v.flatNo === params.flatNo);
      }
      if (params.search) {
        const searchRegex = new RegExp(params.search, 'i');
        list = list.filter(v => searchRegex.test(v.name) || searchRegex.test(v.type) || (v.passcode && searchRegex.test(v.passcode)));
      }
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  },
  create: async (visitorData) => {
    try {
      const response = await axios.post(VISITOR_API_BASE_URL, visitorData);
      return response.data;
    } catch (error) {
      console.warn('Backend offline, saving visitor to LocalStorage:', error.message);
      const list = getLocalVisitors();
      const newVisitor = {
        ...visitorData,
        passcode: Math.floor(100000 + Math.random() * 900000).toString(),
        status: visitorData.status || 'Approved',
        _id: 'mock-visitor-' + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString()
      };
      list.push(newVisitor);
      saveLocalVisitors(list);
      return newVisitor;
    }
  },
  update: async (id, visitorData) => {
    try {
      const response = await axios.put(`${VISITOR_API_BASE_URL}/${id}`, visitorData);
      return response.data;
    } catch (error) {
      console.warn('Backend offline, updating visitor in LocalStorage:', error.message);
      const list = getLocalVisitors();
      const index = list.findIndex(v => v._id === id);
      if (index !== -1) {
        const updated = { ...list[index], ...visitorData };
        if (visitorData.status === 'Checked In') {
          updated.checkedInAt = new Date().toISOString();
          addLocalNotification({
            recipient: updated.flatNo,
            title: 'Visitor Checked In',
            message: `${updated.name} (${updated.type}) has checked in to your flat.`,
            type: 'visitor_checkin'
          });
        } else if (visitorData.status === 'Checked Out') {
          updated.checkedOutAt = new Date().toISOString();
          addLocalNotification({
            recipient: updated.flatNo,
            title: 'Visitor Checked Out',
            message: `${updated.name} (${updated.type}) has checked out from your flat.`,
            type: 'visitor_checkout'
          });
        }
        list[index] = updated;
        saveLocalVisitors(list);
        return list[index];
      }
      throw new Error('Visitor not found in local storage');
    }
  },
  delete: async (id) => {
    try {
      const response = await axios.delete(`${VISITOR_API_BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.warn('Backend offline, deleting visitor from LocalStorage:', error.message);
      const list = getLocalVisitors();
      const filtered = list.filter(v => v._id !== id);
      saveLocalVisitors(filtered);
      return { message: 'Visitor removed successfully' };
    }
  }
};

const POST_API_BASE_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/residents', '/posts') : 'http://localhost:5000/api/posts';

const getLocalPosts = () => {
  const local = localStorage.getItem('gatepass_posts');
  if (!local) return [];
  return JSON.parse(local);
};

const saveLocalPosts = (posts) => {
  localStorage.setItem('gatepass_posts', JSON.stringify(posts));
};

export const postApi = {
  getAll: async () => {
    try {
      const response = await axios.get(POST_API_BASE_URL);
      return response.data;
    } catch (error) {
      console.warn('Backend offline, using LocalStorage fallback for posts:', error.message);
      return getLocalPosts().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  },
  create: async (postData) => {
    try {
      const response = await axios.post(POST_API_BASE_URL, postData);
      return response.data;
    } catch (error) {
      console.warn('Backend offline, saving post to LocalStorage:', error.message);
      const list = getLocalPosts();
      const newPost = {
        ...postData,
        _id: 'mock-post-' + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString()
      };
      list.push(newPost);
      saveLocalPosts(list);
      addLocalNotification({
        recipient: 'all',
        title: 'New Community Announcement',
        message: `${newPost.authorName} (Flat ${newPost.flatNo}) posted: "${newPost.title}"`,
        type: 'community'
      });
      return newPost;
    }
  },
  addComment: async (id, commentData) => {
    try {
      const response = await axios.post(`${POST_API_BASE_URL}/${id}/comments`, commentData);
      return response.data;
    } catch (error) {
      console.warn('Backend offline, adding comment in LocalStorage:', error.message);
      const list = getLocalPosts();
      const index = list.findIndex(p => p._id === id);
      if (index !== -1) {
        if (!list[index].comments) {
          list[index].comments = [];
        }
        const newComment = {
          ...commentData,
          _id: 'mock-comment-' + Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString()
        };
        list[index].comments.push(newComment);
        saveLocalPosts(list);
        const isSystemAdmin = commentData.flatNo === 'Admin' || commentData.authorName === 'System Admin' || commentData.authorName === 'System Administrator';
        addLocalNotification({
          recipient: isSystemAdmin ? 'all' : 'admin',
          title: isSystemAdmin ? 'Admin Commented on Post' : 'New Comment on Post',
          message: `${commentData.authorName} (${commentData.flatNo}): "${commentData.text}" on post "${list[index].title}"`,
          type: 'community'
        });
        return list[index];
      }
      throw new Error('Post not found in local storage');
    }
  }
};

const NOTIF_API_BASE_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/residents', '/notifications') : 'http://localhost:5000/api/notifications';

export const notificationApi = {
  getAll: async (role, flatNo) => {
    try {
      const response = await axios.get(NOTIF_API_BASE_URL, {
        params: { role, flatNo }
      });
      return response.data;
    } catch (error) {
      console.warn('Backend offline, using LocalStorage fallback for notifications:', error.message);
      const list = JSON.parse(localStorage.getItem('gatepass_notifications') || '[]');
      const recipientValue = role === 'admin' ? 'admin' : flatNo;
      return list.filter(n => n.recipient === 'all' || n.recipient === recipientValue)
                 .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  },
  markAsRead: async (id) => {
    try {
      const response = await axios.put(`${NOTIF_API_BASE_URL}/${id}/read`);
      return response.data;
    } catch (error) {
      console.warn('Backend offline, marking notification read in LocalStorage:', error.message);
      const list = JSON.parse(localStorage.getItem('gatepass_notifications') || '[]');
      const index = list.findIndex(n => n._id === id);
      if (index !== -1) {
        list[index].isRead = true;
        localStorage.setItem('gatepass_notifications', JSON.stringify(list));
        return list[index];
      }
      throw new Error('Notification not found');
    }
  },
  clearAll: async (role, flatNo) => {
    try {
      await axios.delete(NOTIF_API_BASE_URL, {
        params: { role, flatNo }
      });
      return { message: 'Notifications cleared successfully' };
    } catch (error) {
      console.warn('Backend offline, clearing notifications in LocalStorage:', error.message);
      const list = JSON.parse(localStorage.getItem('gatepass_notifications') || '[]');
      const recipientValue = role === 'admin' ? 'admin' : flatNo;
      const filtered = list.filter(n => n.recipient !== 'all' && n.recipient !== recipientValue);
      localStorage.setItem('gatepass_notifications', JSON.stringify(filtered));
      return { message: 'Notifications cleared successfully' };
    }
  },
  createBroadcast: async (title, message) => {
    try {
      const response = await axios.post(NOTIF_API_BASE_URL, {
        recipient: 'all',
        title,
        message,
        type: 'admin_broadcast'
      });
      return response.data;
    } catch (error) {
      console.warn('Backend offline, broadcasting in LocalStorage:', error.message);
      return addLocalNotification({
        recipient: 'all',
        title,
        message,
        type: 'admin_broadcast'
      });
    }
  }
};
