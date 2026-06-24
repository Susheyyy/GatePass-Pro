import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/residents';

const DEFAULT_RESIDENTS = [
  {
    _id: 'mock-1',
    flatNo: 'A-101',
    name: 'Rajesh Kumar',
    mobile: '9876543210',
    email: 'rajesh.a101@gatepass.com',
    members: 4,
    status: 'Pending',
    createdAt: new Date().toISOString()
  },
  {
    _id: 'mock-2',
    flatNo: 'B-304',
    name: 'Priya Sharma',
    mobile: '9812345678',
    email: 'priya.b304@gatepass.com',
    members: 3,
    status: 'Approved',
    createdAt: new Date().toISOString()
  },
  {
    _id: 'mock-3',
    flatNo: 'C-502',
    name: 'Vikram Singh',
    mobile: '9988776655',
    email: 'vikram.c502@gatepass.com',
    members: 5,
    status: 'Rejected',
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
      const response = await axios.post(`${API_BASE_URL}`, {
        ...residentData,
        status: 'Pending'
      });
      return response.data;
    } catch (error) {
      console.warn('Backend offline, saving to LocalStorage:', error.message);
      const list = getLocalResidents();
      const newResident = {
        ...residentData,
        status: 'Pending',
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
      console.warn('Backend offline, updating in LocalStorage:', error.message);
      const list = getLocalResidents();
      const index = list.findIndex(r => r._id === id);
      if (index !== -1) {
        list[index] = { ...list[index], ...residentData };
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
      console.warn('Backend offline, deleting from LocalStorage:', error.message);
      const list = getLocalResidents();
      const filtered = list.filter(r => r._id !== id);
      saveLocalResidents(filtered);
      return { message: 'Resident removed successfully from local storage' };
    }
  }
};
