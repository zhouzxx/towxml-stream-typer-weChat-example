//markdown语法特殊字符
const mkSyntaxChars = [
  "\n",
  "\r",
  "\r\n",
  "#",
  "*",
  "_",
  "`",
  ">",
  "[",
  "]",
  "(",
  ")",
  "|",
  "-",
  "+",
  ".",
  "-",
  "^",
  // "~",
  "\\",
  // ":",
  // "=",
  // "$",
  // "&",
  " ",
];
const towxml = require("./index");
const {
  textRenderCb,
  textInstaceUuid,
  curText,
  initTextCb,
  destroyTextData,
} = require("./typable-text/text-cb");
const {
  mdTextStore,
  towxmlScrollCb,
  streamFinishStore,
  destroyTowxmlData,
  stopStore
} = require("./globalCb");
const {
  batchRenderCb,
  batchHide,
  batchShow,
  batchSetHeight,
  batchHeight,
  initBatchCb,
  destroyBatchData,
} = require("./batch/batch-cb");
Component({
  options: {
    styleIsolation: "shared",
  },
  properties: {
    towxmlId: {
      type: String,
      value: "",
    },
    speed: {
      type: Number,
      value: 10,
    },
    openTyper: {
      type: Boolean,
      value: true,
    },
    theme: {
      type: String,
      value: "light",
    },
  },
  lifetimes: {
    ready: function () {
      console.log("ready中当前towxml组件的id: ", this.data.towxmlId);
      console.log("开始打字时间：", new Date());
      console.log("创建了towxml组件实例");
      if (this.data.openTyper && !this.isStarted) {
        streamFinishStore.value[this.data.towxmlId] = false;
        initTextCb(this.data.towxmlId);
        initBatchCb(this.data.towxmlId);
        this.setData({ startShowBatch: true });
        this.isStarted = true;
        const _this = this;
        const screenHeight = wx.getSystemInfoSync().screenHeight;
        console.log("屏幕的高度：", screenHeight);
        towxmlScrollCb.value[this.data.towxmlId] = () => {
          const query = _this.createSelectorQuery();
          query
            .select(`#towxml-${_this.data.towxmlId}`)
            .boundingClientRect(async function (rect) {
              // console.log(`towxml${_this.data.towxmlId}的rect的值：`, rect)
              if (!rect) {
                return;
              }
              const uplimt = (_this.data.screenNum - 0.5) * screenHeight * -1;
              const downlimt = (_this.data.screenNum + 0.5) * screenHeight;
              const _batchIds = Object.keys(
                batchHeight.value[_this.data.towxmlId]
              );
              _batchIds.sort((a, b) => parseInt(a) - parseInt(b));
              let totalHeight = 0;
              const showIds = [];
              const hideIds = [];
              for (let i of _batchIds) {
                totalHeight =
                  totalHeight + batchHeight.value[_this.data.towxmlId][i];
              }
              if (rect.top > downlimt || rect.top + totalHeight < uplimt) {
                for (let m of _batchIds) {
                  hideIds.push(m);
                }
              } else {
                let curTotalHeight = 0;
                for (let n of _batchIds) {
                  const curBatchHeight =
                    batchHeight.value[_this.data.towxmlId][n];
                  const curBatchUp = rect.top + curTotalHeight;
                  const curBatchDown =
                    rect.top + curTotalHeight + curBatchHeight;
                  if (
                    (curBatchUp >= uplimt && curBatchUp <= downlimt) ||
                    (curBatchDown >= uplimt && curBatchDown <= downlimt) ||
                    (curBatchUp <= uplimt && curBatchDown >= downlimt)
                  ) {
                    showIds.push(n);
                  } else {
                    hideIds.push(n);
                  }
                  curTotalHeight = curTotalHeight + curBatchHeight;
                }
              }
              //之所以把要隐藏或者显示的batch组件放到这个来进行堵塞式渲染，就是因为如果同一时间高频的setData,可能会造成小程序渲染线程的渲染压力太大，而导致小程序直接闪退
              for (let hideId of hideIds) {
                batchHide.value[_this.data.towxmlId][hideId]();
                await new Promise((resolve) =>
                  setTimeout(() => {
                    resolve();
                  }, 40)
                );
              }
              for (let showId of showIds) {
                batchShow.value[_this.data.towxmlId][showId]();
                await new Promise((resolve) =>
                  setTimeout(() => {
                    resolve();
                  }, 80)
                );
              }
            })
            .exec();
        };
        this.startType();
      }
      if (!this.data.openTyper) {
        this.setData({
          dataNodes: towxml(
            mdTextStore.value[this.data.towxmlId],
            "markdown",
            {},
            this.data.towxmlId
          ),
        });
      }
    },
    //销毁该towxml实例相关的全局数据，防止内存泄漏
    detached: function () {
      destroyTextData(this.data.towxmlId);
      destroyBatchData(this.data.towxmlId);
      destroyTowxmlData(this.data.towxmlId);
    },
  },
  data: {
    dataNodes: [],
    isStarted: false,
    batchIds: [0, 1], //先提前创建两个分批组件,方便后面进行隔代创建
    batchSize: 40,
    startShowBatch: false,
    screenNum: 10, //这个参数是指滚动时加载上下多少屏的数据，比如这里设置的8，就是加载当前屏幕中线位置上面8屏和下面8屏的数据
  },
  methods: {
    startType() {
      const _this = this;
      let finishIndex = -1;
      let c = 0;
      let typerText = "";
      let allText = "";
      let oldFirstLevelChildNodes = [];
      let typerTimer = undefined;
      let testAfterMkSyntaxChar = "";
      let flag = false;
      let tmpUuid = "";
      let index = 0;
      let isNeedFlushIndex = false;
      let lastCurText = "";
      typerTimer = this.customSetInterval(() => {
        //强制终止
        if(stopStore.value[_this.data.towxmlId] == true){
          this.triggerEvent("finish", {
            message: "打字完毕！",
          });
          console.log("结束打字时间：", new Date());
          typerTimer.cancel();
          return
        }
        if (
          batchRenderCb.value[_this.data.towxmlId][
            _this.data.batchIds[_this.data.batchIds.length - 1]
          ] == undefined
        ) {
          // console.log(`空转一下，等待batch组件实例${_this.data.batchIds[_this.data.batchIds.length - 1]}创建好`)
          return;
        }
        if (
          streamFinishStore.value[_this.data.towxmlId] &&
          c >= mdTextStore.value[_this.data.towxmlId].length
        ) {
          //最后一段文本可能打印不完全，这里善后一下
          const objTree = towxml(
            allText.substring(finishIndex),
            "markdown",
            {},
            _this.data.towxmlId
          );
          for (let i = 0; i < objTree.children.length; i++) {
            _this.data.dataNodes[oldFirstLevelChildNodes.length + i] =
              objTree.children[i];
            //通过路径的方式，一个个元素地渲染，比直接_this.setData(dataNodes,数组)的方式，效率提高很多
            _this.setData({
              [`dataNodes[${oldFirstLevelChildNodes.length + i}]`]:
                objTree.children[i],
            });
          }
          //重新设置一下batch的高度，防止有些batch里面有图片等加载需要一定时间的元素，导致记录的batch有误
          for (let i of _this.data.batchIds) {
            batchSetHeight.value[_this.data.towxmlId][i](true);
          }
          // console.log(
          //   "batchHeight的值: ",
          //   batchHeight.value[_this.data.towxmlId]
          // );
          // console.log(
          //   "看下全文的对象树",
          //   towxml(allText, "markdown", {}, _this.data.towxmlId)
          // );
          this.triggerEvent("finish", {
            message: "打字完毕！",
          });
          console.log("结束打字时间：", new Date());
          typerTimer.cancel();
          return;
        }
        if (
          !mdTextStore.value[_this.data.towxmlId] ||
          c >= mdTextStore.value[_this.data.towxmlId].length
        ) {
          return;
        }
        const singleChar = mdTextStore.value[_this.data.towxmlId][c];
        const lastSingleChar = mdTextStore.value[_this.data.towxmlId][c - 1];
        c++;
        if (singleChar == undefined) {
          return;
        }
        typerText = typerText + singleChar;
        allText = allText + singleChar;
        //更新最新的文本组件实例对应的显示文本的第一个字符的位置
        if (isNeedFlushIndex) {
          if (tmpUuid != textInstaceUuid.value[_this.data.towxmlId]) {
            index = c - 2;
          }
          //用来处理以下情况：
          //<think>
          //嗯
          if (
            tmpUuid == textInstaceUuid.value[_this.data.towxmlId] &&
            c - index - 1 !== curText.value[_this.data.towxmlId].length &&
            curText.value[_this.data.towxmlId] === allText[c - 2] &&
            lastCurText !== curText.value[_this.data.towxmlId]
          ) {
            index = c - 2;
          }
          isNeedFlushIndex = false;
        }
        //当碰到换行符的时候，渲染一下未复用的数据，这个if对应的bug的文本
        //**comm**
        // ```bash
        // conda
        // ```
        if (singleChar.match(/\r?\n/g)) {
          // console.log("换行复用文本长度：", allText.length - finishIndex)
          const objTree = towxml(
            allText.substring(finishIndex),
            "markdown",
            {},
            _this.data.towxmlId
          );
          const allNodesSize =
            objTree.children.length + oldFirstLevelChildNodes.length;
          if (
            allNodesSize >=
            (_this.data.batchIds.length - 1) * _this.data.batchSize
          ) {
            //当第n个批组件用完了，就创建n+2个批组件，隔代创建，防止batchRenderCb.value[_this.data.towxmlId][batchNum]为undifined
            const _batchId =
              Math.trunc(allNodesSize / _this.data.batchSize) + 1;
            _this.data.batchIds[_batchId] = _batchId;
            _this.setData({
              [`batchIds[${_batchId}]`]: _batchId,
            });
          }

          for (let i = 0; i < objTree.children.length; i++) {
            _this.data.dataNodes[oldFirstLevelChildNodes.length + i] =
              objTree.children[i];
            //通过路径的方式，一个个元素地渲染，比直接_this.setData(dataNodes,数组)的方式，效率提高很多

            (function renderNodeWhenEnter() {
              const batchNum = Math.trunc(
                (oldFirstLevelChildNodes.length + i) / _this.data.batchSize
              );
              const renderIndex =
                (oldFirstLevelChildNodes.length + i) % _this.data.batchSize;
              batchRenderCb.value[_this.data.towxmlId][batchNum](
                renderIndex,
                objTree.children[i]
              );
            })();
          }
          //上一次可能渲染了多余的节点，这次要去掉
          for (
            let x = oldFirstLevelChildNodes.length + objTree.children.length;
            x < _this.data.dataNodes.length;
            x++
          ) {
            (function renderUnknowNodeWhenEnter() {
              const batchNum = Math.trunc(x / _this.data.batchSize);
              const renderIndex = x % _this.data.batchSize;
              batchRenderCb.value[_this.data.towxmlId][batchNum](renderIndex, {
                tag: "unknow",
              });
              // _this.setData({ [`dataNodes[${x}]`]: { tag: "unknow" } });
            })();
          }
        }
        if (_this.isMkSyntaxChar(lastSingleChar, singleChar)) {
          testAfterMkSyntaxChar = "";
        } else {
          testAfterMkSyntaxChar = testAfterMkSyntaxChar + singleChar;
          if (testAfterMkSyntaxChar.length == 1) {
            isNeedFlushIndex = true;
            tmpUuid = textInstaceUuid.value[_this.data.towxmlId];
            lastCurText = curText.value[_this.data.towxmlId];
            const objTree = towxml(
              allText.substring(finishIndex),
              "markdown",
              {},
              _this.data.towxmlId
            );
            const allNodesSize =
              objTree.children.length + oldFirstLevelChildNodes.length;
            if (
              allNodesSize >=
              (_this.data.batchIds.length - 1) * _this.data.batchSize
            ) {
              //当第n个批组件用完了，就创建n+2个批组件，隔代创建，防止batchRenderCb.value[_this.data.towxmlId][batchNum]为undifined
              const _batchId =
                Math.trunc(allNodesSize / _this.data.batchSize) + 1;
              _this.data.batchIds[_batchId] = _batchId;
              _this.setData({
                [`batchIds[${_batchId}]`]: _batchId,
              });
            }
            // console.log("未复用文本长度：", allText.length - finishIndex);
            // console.log("当前finishIndex: ", finishIndex);
            // console.log("当前字符串：\n", allText.substring(finishIndex));
            // console.log("渲染对应的第一个字符：", singleChar);
            // console.log("当前对象数据：", objTree.children);
            for (let i = 0; i < objTree.children.length; i++) {
              _this.data.dataNodes[oldFirstLevelChildNodes.length + i] =
                objTree.children[i];
              //通过路径的方式，一个个元素地渲染，比直接_this.setData(dataNodes,数组)的方式，效率提高很多
              (function renderNode() {
                const batchNum = Math.trunc(
                  (oldFirstLevelChildNodes.length + i) / _this.data.batchSize
                );
                const renderIndex =
                  (oldFirstLevelChildNodes.length + i) % _this.data.batchSize;
                batchRenderCb.value[_this.data.towxmlId][batchNum](
                  renderIndex,
                  objTree.children[i]
                );
                // _this.setData({
                //   [`dataNodes[${oldFirstLevelChildNodes.length + i}]`]:
                //     objTree.children[i],
                // });
              })();
            }
            //上一次可能渲染了多余的节点，这次要去掉
            for (
              let x = oldFirstLevelChildNodes.length + objTree.children.length;
              x < _this.data.dataNodes.length;
              x++
            ) {
              (function renderUnknowNode() {
                const batchNum = Math.trunc(x / _this.data.batchSize);
                const renderIndex = x % _this.data.batchSize;
                batchRenderCb.value[_this.data.towxmlId][batchNum](
                  renderIndex,
                  { tag: "unknow" }
                );
                // _this.setData({ [`dataNodes[${x}]`]: { tag: "unknow" } });
              })();
            }
            //以下是判断是否可以复用的逻辑，复用的条件就是：当最新的内容转化出来有n个节点，那么只有第n个是可能不完整的，前n-1个是可以复用的
            //allText.substring(finishIndex, allText.length - 1)截至是 allText.length - 1而不是allText.length，是为了避免1. 2.这种有序列表情况触发的问题，因为1，2不是markdown特殊语法字符，但是1. 却是
            const curNewNodes = towxml(
              allText.substring(finishIndex, allText.length - 1),
              "markdown",
              {},
              _this.data.towxmlId
            );
            // console.log("curNewNodes的值：", curNewNodes);
            const curNewNodesNum = Math.min(
              curNewNodes.children.length,
              objTree.children.length
            );
            if (curNewNodesNum >= 2) {
              let j = allText.length - 1;
              while (true) {
                //allText[j - 1].match( /\r?\n/g) 这句话也是为了避免1. 2.这种有序列表情况触发的问题,同时对复用加以限制，每次在换行处才可能可以复用，即：curNewNodesNum >= 2 时不一定就能复用成功，还得以换行为单位
                //应该判断allText[j - 1] && allText[j - 1].match(/\r?\n/g) 和 tmpNodes.children.length <= curNewNodesNum - 1同时成立，拆成两个if,提高效率
                if (allText[j - 1] && allText[j - 1].match(/\r?\n/g)) {
                  const tmpNodes = towxml(
                    allText.substring(finishIndex, j),
                    "markdown",
                    {},
                    _this.data.towxmlId
                  );
                  if (tmpNodes.children.length <= curNewNodesNum - 1) {
                    for (let i = 0; i < tmpNodes.children.length; i++) {
                      oldFirstLevelChildNodes.push(objTree.children[i]);
                    }
                    const batchNum = Math.trunc(
                      oldFirstLevelChildNodes.length / _this.data.batchSize
                    );
                    for (let b = 0; b < batchNum - 1; b++) {
                      batchSetHeight.value[_this.data.towxmlId][b]();
                    }
                    finishIndex = j;
                    break;
                  }
                }
                j--;
              }
            }
          } else {
            // console.log("当前c和当前字符的值：", c, singleChar);
            // console.log("tmpUuid的值", tmpUuid);
            // console.log("textInstaceUuid.value[_this.data.towxmlId]的值", textInstaceUuid.value[_this.data.towxmlId]);
            // console.log("curText.value[_this.data.towxmlId]:");
            // console.log(curText.value[_this.data.towxmlId]);
            // console.log("c - index - 1的值", c - index - 1);
            // console.log("curText.value[_this.data.towxmlId].length的值", curText.value[_this.data.towxmlId].length);
            if (textRenderCb.value[_this.data.towxmlId] && singleChar) {
              //产生了新的文本实例，一段连续显示的文本中还没有碰到特殊markdown字符
              if (tmpUuid != textInstaceUuid.value[_this.data.towxmlId]) {
                textRenderCb.value[_this.data.towxmlId](singleChar);
                return;
              } else {
                //没有产生新的文本实例，一段连续显示的文本中碰到了特殊markdown字符，但是这个特殊字符是正常显示
                if (
                  c - index - 1 ===
                  curText.value[_this.data.towxmlId].length
                ) {
                  textRenderCb.value[_this.data.towxmlId](singleChar);
                  return;
                }
                //markdown字符串中转义的情况
                if (
                  _this.unescapeMarkdown(allText.substring(index, c - 1))
                    .length === curText.value[_this.data.towxmlId].length
                ) {
                  textRenderCb.value[_this.data.towxmlId](singleChar);
                  return;
                }
                //没有产生新的文本实例，一段连续显示的文本中碰到了特殊markdown字符，但是特殊字符不是正常显示，最后那个正常字符确正常显示
                //<think>
                //嗯
                if (
                  c - index - 1 !== curText.value[_this.data.towxmlId].length &&
                  curText.value[_this.data.towxmlId] === allText[c - 2] &&
                  lastCurText !== curText.value[_this.data.towxmlId]
                ) {
                  textRenderCb[_this.data.towxmlId].value(singleChar);
                  return;
                }
                //还有一种情况,不做处理：没有产生新的文本实例，一段连续显示的文本中碰到了特殊markdown字符，但是特殊字符不是正常显示，最后那个正常字符确不正常显示，如：
                //# hello
                //```python
              }
            }
          }
        }
      }, _this.data.speed);
    },
    isMkSyntaxChar(c1, c2) {
      const ar1 = [" ", "+", ":", "(", "-"];
      // const ar2 = ["##", "**", "__", "--", "``", "~~", "# ", ". ", "  "];
      const ar3 = ["*", "_", "`", "~"]; //ar3中包含的markdwon字符是可能有意义的
      const spaceLikeCodes = [160, 8203, 8204, 8205, 8239, 12288]; //长得像空格的特殊码值
      // 不间断空格	160
      // 零宽空格	8203
      // 零宽不连字	8204
      // 零宽连字	8205
      // 窄空格	8239
      // 全角空格	12288
      if (spaceLikeCodes.includes(c2.charCodeAt(0))) {
        return true;
      }
      if (ar3.includes(c2)) {
        return true;
      }
      // //ar1中字符前面不是特殊的markdown字符，那一定不是有特殊含义的markdwon字符
      if (ar1.includes(c2) && !mkSyntaxChars.includes(c1)) {
        return false;
      }
      // //如果.号的前面不是数字,那一定不是有特殊含义的markdwon字符
      if (!/^\d$/.test(c1) && c2 === ".") {
        return false;
      }
      // //如果连续两个markdwon特殊字符的组合不是ar2中的一个，且第二个字符串不为" "以及换行符,那第二个字符一定没有意义
      // if (
      //   mkSyntaxChars.includes(c1) &&
      //   mkSyntaxChars.includes(c2) &&
      //   c2 != " " &&
      //   !c1.match(/\r?\n/g) &&
      //   !c2.match(/\r?\n/g) &&
      //   !ar2.includes(c1 + c2)
      // ) {
      //   return false;
      // }
      return (
        mkSyntaxChars.includes(c2) || c2.match(/\r?\n/g) || c2.match(/\t/g)
      );
    },
    unescapeMarkdown(text) {
      // 定义常见的 Markdown 转义字符及其对应的原始字符
      const escapeChars = {
        "\\*": "*",
        "\\_": "_",
        "\\#": "#",
        "\\+": "+",
        "\\-": "-",
        "\\.": ".",
        "\\`": "`",
        "\\[": "[",
        "\\]": "]",
        "\\(": "(",
        "\\)": ")",
        "\\!": "!",
        "\\>": ">",
      };
      let unescapedText = text;
      for (const [escaped, original] of Object.entries(escapeChars)) {
        unescapedText = unescapedText.replaceAll(escaped, original);
      }
      return unescapedText;
    },
    //通过setTimeout自定义setInterval,因为如果使用js的setInterval,每次回调的时候可能大于设置的间隔时间，导致报警告：[Violation] 'setInterval' handler took 50ms
    customSetInterval(callback, delay) {
      let timer = null;
      let isRunning = true;
      const run = () => {
        if (!isRunning) return;
        const start = Date.now();
        try {
          callback();
        } catch (error) {
          console.error("回调函数执行出错:", error);
        }
        const end = Date.now();
        const actualTime = end - start;
        const nextDelay = actualTime < delay ? delay - actualTime : 0;
        if (timer !== null) {
          clearTimeout(timer);
        }
        timer = setTimeout(run, nextDelay);
      };
      run();
      return {
        cancel: () => {
          if (timer !== null && isRunning) {
            clearTimeout(timer);
            timer = null;
            isRunning = false;
          }
        },
      };
    },
  },
});
