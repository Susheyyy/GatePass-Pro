import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/residents';

const DEFAULT_RESIDENTS = [
  {
    _id: 'mock-1',
    flatNo: 'A-101',
    name: 'Rajesh Kumar',
    mobile: '9876543210',
    email: 'rajesh.a101@gatepass.com',
    gmail: 'rajesh@gmail.com',
    members: 4,
    status: 'Pending',
    otp: '654321',
    password: 'resident123',
    isFirstLogin: true,
    createdAt: new Date().toISOString()
  },
  {
    _id: 'mock-2',
    flatNo: 'B-304',
    name: 'Priya Sharma',
    mobile: '9812345678',
    email: 'priya.b304@gatepass.com',
    gmail: 'priya@gmail.com',
    members: 3,
    status: 'Approved',
    otp: '',
    password: 'securepassword1',
    isFirstLogin: false,
    createdAt: new Date().toISOString()
  }
];

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

export const residentApi = {
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
        if (residentData.password && residentData.otp) {
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
            list[index].distressMessages.push({
              message: residentData.distressMessage,
              createdAt: new Date().toISOString(),
              _id: 'msg-' + Math.random().toString(36).substr(2, 9)
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
        list[index] = { ...list[index], ...visitorData };
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
      return newPost;
    }
  }
};
