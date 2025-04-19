const mdTextStore = { value: {} };
const towxmlScrollCb = { value: {} };
const streamFinishStore = { value: {} };
const stopStore = { value: {} };

function destroyTowxmlData(id) {
  mdTextStore.value[id] = undefined;
  towxmlScrollCb.value[id] = undefined;
  streamFinishStore.value[id] = undefined;
  stopStore.value[id] = false;
}

function setMdText(id, text) {
  mdTextStore.value[id] = text;
}

function setStreamFinsih(id) {
  streamFinishStore.value[id] = true;
}

function stopImmediatelyCb(id){
  stopStore.value[id] = true;
}

//节流
function throttle(func, delay) {
  let timer = null;
  return function () {
    if (!timer) {
      func.apply(this, arguments);
      timer = setTimeout(() => {
        timer = null;
      }, delay);
    }
  };
}

const scrollCb = throttle(async () => {
  for (let k in towxmlScrollCb.value) {
    towxmlScrollCb.value[k]();
    await new Promise((resolve) =>
      setTimeout(() => {
        resolve();
      }, 30)
    );
  }
}, 400);

module.exports = {
  setMdText,
  scrollCb,
  towxmlScrollCb,
  mdTextStore,
  streamFinishStore,
  setStreamFinsih,
  destroyTowxmlData,
  stopStore,
  stopImmediatelyCb
};
