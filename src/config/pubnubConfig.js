import PubNub from 'pubnub';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const pubnub = new PubNub({
  publishKey: 'pub-c-60ac0aaa-b3ef-4062-8263-b1eaae3d04eb',
  subscribeKey: 'sub-c-ba7d71b0-b958-4c75-bf73-39cace116ebd',
  uuid: generateUUID(), // Generate a unique identifier for the user
});

export default pubnub;
