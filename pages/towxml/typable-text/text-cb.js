const textRenderCb = { value: undefined };
const textInstaceUuid = { value: undefined };
const curText = { value: "" };
function initTextCb() {
  textRenderCb.value = undefined;
  textInstaceUuid.value = undefined;
  curText.value = "";
}
module.exports = {
  textRenderCb,
  textInstaceUuid,
  curText,
  initTextCb,
};
