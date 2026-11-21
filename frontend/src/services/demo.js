const PREFIX = 'gatepass_demo:';

export const isDemoSession = () => sessionStorage.getItem('gatepass_demo') === 'true';

// Demo data lives only in this tab and never overwrites normal offline records.
export const apiStorage = {
  getItem: (key) => isDemoSession() ? sessionStorage.getItem(PREFIX + key) : localStorage.getItem(key),
  setItem: (key, value) => isDemoSession() ? sessionStorage.setItem(PREFIX + key, value) : localStorage.setItem(key, value)
};

export function endDemoSession() {
  if (isDemoSession()) sessionStorage.removeItem('gatepass_token');
  sessionStorage.removeItem('gatepass_demo');
  for (const key of Object.keys(sessionStorage)) {
    if (key.startsWith(PREFIX)) sessionStorage.removeItem(key);
  }
}

export function startDemoSession(role) {
  if (!['admin', 'security', 'resident'].includes(role)) throw new Error('Choose a valid demo role.');
  endDemoSession();
  sessionStorage.setItem('gatepass_demo', 'true');
  const now = Date.now();
  const ago = (minutes) => new Date(now - minutes * 60000).toISOString();
  const residents = [
    { _id: 'demo-resident-1', name: 'Aarav Shah', flatNo: 'A-101', email: 'aarav.a101@example.com', gmail: 'aarav.shah@example.com', mobile: '0000000001', members: 3, vehicles: ['MH00DE1001'], status: 'Approved', communityId: 'DEMO-101' },
    { _id: 'demo-resident-2', name: 'Meera Rao', flatNo: 'B-202', email: 'meera.b202@example.com', gmail: 'meera.rao@example.com', mobile: '0000000002', members: 2, vehicles: ['MH00DE2002'], status: 'Approved', communityId: 'DEMO-202' },
    { _id: 'demo-resident-3', name: 'Riya Patel', flatNo: 'C-303', email: 'riya.c303@example.com', gmail: 'riya.patel@example.com', mobile: '0000000003', members: 4, vehicles: [], status: 'Pending', communityId: 'DEMO-303' }
  ].map(resident => ({ ...resident, isFirstLogin: false, bio: 'Sample resident at Maple Heights.', location: 'Maple Heights (Demo)', address: `Flat ${resident.flatNo}, Maple Heights`, distressStatus: 'None', distressMessages: [], avatar: 'avatar1', createdAt: ago(120) }));
  const visitors = [
    { _id: 'demo-visitor-1', name: 'Demo Guest', type: 'Guest', flatNo: 'A-101', status: 'Approved', purpose: 'Family visit', passcode: '123456' },
    { _id: 'demo-visitor-2', name: 'Demo Courier', type: 'Delivery', flatNo: 'B-202', status: 'Checked In', purpose: 'Parcel delivery', passcode: '234567', checkedInAt: ago(15) },
    { _id: 'demo-visitor-3', name: 'Demo Electrician', type: 'Maintenance', flatNo: 'A-101', status: 'Checked Out', purpose: 'Scheduled repair', passcode: '345678', checkedInAt: ago(90), checkedOutAt: ago(45) },
    { _id: 'demo-visitor-4', name: 'Demo Visitor', type: 'Guest', flatNo: 'A-101', status: 'Pending', purpose: 'Visit resident', passcode: '456789' }
  ].map((visitor, index) => ({ ...visitor, mobile: `000000001${index}`, vehicleNumber: '', createdAt: ago(120), time: ago(120) }));
  apiStorage.setItem('gatepass_residents', JSON.stringify(residents));
  apiStorage.setItem('gatepass_visitors', JSON.stringify(visitors));
  apiStorage.setItem('gatepass_posts', JSON.stringify([{ _id: 'demo-post-1', title: 'Welcome to Maple Heights', description: 'Explore visitor approvals, gate entry and community announcements with fictional sample data.', category: 'General', authorName: 'System Administrator', flatNo: 'Admin', comments: [], createdAt: ago(30) }]));
  apiStorage.setItem('gatepass_notifications', JSON.stringify([{ _id: 'demo-notification-1', recipient: 'all', title: 'Welcome to the demo', message: 'Try checking in Demo Guest at A-101 with passcode 123456. All changes stay in this tab.', type: 'admin_broadcast', isRead: false, createdAt: ago(5) }]));
  const payload = { role, email: role === 'resident' ? residents[0].email : `${role}@example.com`, demo: true, ...(role === 'resident' ? { residentId: residents[0]._id, flatNo: residents[0].flatNo } : {}) };
  // Deliberately not a signed JWT; never accepted by the backend.
  sessionStorage.setItem('gatepass_token', `demo.${btoa(JSON.stringify(payload))}`);
  return role === 'admin' ? '/' : role === 'security' ? '/visitors' : '/resident-dashboard';
}
