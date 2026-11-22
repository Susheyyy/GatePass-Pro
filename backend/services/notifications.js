const Notification = require('../models/Notification');
const { audience, occupancyRoom } = require('./occupancy');

function notificationScope(user) {
  if (user.role === 'resident') return { audienceOccupancyIds: user.occupancyId || '__no_occupancy__' };
  return { recipient: { $in: [user.role === 'admin' ? 'admin' : 'security', 'all'] } };
}

async function publishNotification(req, data, recipients) {
  const recipient = data.recipient || 'all';
  const ids = recipients || (['admin', 'security'].includes(recipient) ? [] : await audience(recipient === 'all' ? undefined : recipient));
  const notification = await Notification.create({ ...data, recipient, audienceOccupancyIds: ids });
  if (['admin', 'all'].includes(recipient)) req.io?.to('room_admins').emit('new_notification', notification);
  if (['security', 'all'].includes(recipient)) req.io?.to('room_security').emit('new_notification', notification);
  for (const id of ids) req.io?.to(occupancyRoom(id)).emit('new_notification', notification);
  return notification;
}

module.exports = { notificationScope, publishNotification };
