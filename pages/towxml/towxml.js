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
} = require("./typable-text/text-cb");
const {
  batchRenderCb,
  initBatchCb
} = require("./batch/batch-cb");
Component({
  options: {
    styleIsolation: "shared",
  },
  properties: {
    mdText: {
      type: Object,
      value: {},
    },
    speed: {
      type: Number,
      value: 10,
    },
    isFinish: {
      type: Boolean,
      value: false,
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
    created: function () {
      initTextCb();
      initBatchCb();
    },
    ready: function () {
      console.log("开始打字时间：", new Date())
      console.log("创建了towxml组件实例");
      if (this.data.openTyper && !this.isStarted) {
        this.isStarted = true;
        this.startType();
      }
      if (!this.data.openTyper) {
        this.setData({
          dataNodes: towxml(this.data.mdText.text, "markdown").children,
        });
      }
    }
  },
  data: {
    dataNodes: [],
    isStarted: false,
    batchIds: [0, 1],//先提前创建两个分批组件,方便后面进行隔代创建
    batchSize: 40
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
        if (batchRenderCb.value[_this.data.batchIds[_this.data.batchIds.length - 1]] == undefined) {
          // console.log(`空转一下，等待batch组件实例${_this.data.batchIds[_this.data.batchIds.length - 1]}创建好`)
          return
        }
        if (_this.data.isFinish && c >= _this.data.mdText.text.length) {
          //最后一段文本可能打印不完全，这里善后一下
          const objTree = towxml(allText.substring(finishIndex), "markdown");
          for (let i = 0; i < objTree.children.length; i++) {
            _this.dataNodes[oldFirstLevelChildNodes.length + i] =
              objTree.children[i];
            //通过路径的方式，一个个元素地渲染，比直接_this.setData(dataNodes,数组)的方式，效率提高很多
            _this.setData({
              [`dataNodes[${oldFirstLevelChildNodes.length + i}]`]:
                objTree.children[i],
            });
          }
          // console.log("看下全文的对象树", towxml(allText, "markdown"));
          this.triggerEvent("finish", {
            message: "打字完毕！",
          });
          console.log("结束打字时间：", new Date())
          typerTimer.cancel()
          return;
        }
        if (!_this.data.mdText.text || c >= _this.data.mdText.text.length) {
          return;
        }
        const singleChar = _this.data.mdText.text[c];
        const lastSingleChar = _this.data.mdText.text[c - 1];
        c++;
        if (singleChar == undefined) {
          return;
        }
        typerText = typerText + singleChar;
        allText = allText + singleChar;
        //更新最新的文本组件实例对应的显示文本的第一个字符的位置
        if (isNeedFlushIndex) {
          if (tmpUuid != textInstaceUuid.value) {
            index = c - 2;
          }
          //用来处理以下情况：
          //<think>
          //嗯
          if (
            tmpUuid == textInstaceUuid.value &&
            c - index - 1 !== curText.value.length &&
            curText.value === allText[c - 2] &&
            lastCurText !== curText.value
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
          const objTree = towxml(allText.substring(finishIndex), "markdown");
          const allNodesSize = objTree.children.length + oldFirstLevelChildNodes.length
          if (allNodesSize >= (_this.data.batchIds.length - 1) * _this.data.batchSize) {
            //当第n个批组件用完了，就创建n+2个批组件，隔代创建，防止batchRenderCb.value[batchNum]为undifined
            const _batchId = Math.trunc(allNodesSize / _this.data.batchSize) + 1
            _this.data.batchIds[_batchId] = _batchId
            _this.setData({
              [`batchIds[${_batchId}]`]:
                _batchId,
            })
          }
          if (!flag) {
            flag = true;
            _this.dataNodes = objTree.children;
            _this.setData({ dataNodes: objTree.children });
          } else {
            for (let i = 0; i < objTree.children.length; i++) {
              _this.dataNodes[oldFirstLevelChildNodes.length + i] =
                objTree.children[i];
              //通过路径的方式，一个个元素地渲染，比直接_this.setData(dataNodes,数组)的方式，效率提高很多

              (function renderNodeWhenEnter() {
                const batchNum = Math.trunc((oldFirstLevelChildNodes.length + i) / _this.data.batchSize)
                const renderIndex = (oldFirstLevelChildNodes.length + i) % _this.data.batchSize
                batchRenderCb.value[batchNum](renderIndex, objTree.children[i])
                // _this.setData({
                //   [`dataNodes[${oldFirstLevelChildNodes.length + i}]`]:
                //     objTree.children[i],
                // });
              })()
            }
            //上一次可能渲染了多余的节点，这次要去掉
            for (
              let x = oldFirstLevelChildNodes.length + objTree.children.length;
              x < _this.dataNodes.length;
              x++
            ) {
              (function renderUnknowNodeWhenEnter() {
                const batchNum = Math.trunc(x / _this.data.batchSize)
                const renderIndex = x % _this.data.batchSize
                batchRenderCb.value[batchNum](renderIndex, { tag: "unknow" })
                // _this.setData({ [`dataNodes[${x}]`]: { tag: "unknow" } });
              })()
            }
          }
        }
        if (_this.isMkSyntaxChar(lastSingleChar, singleChar)) {
          testAfterMkSyntaxChar = "";
        } else {
          testAfterMkSyntaxChar = testAfterMkSyntaxChar + singleChar;
          if (testAfterMkSyntaxChar.length == 1) {
            isNeedFlushIndex = true;
            tmpUuid = textInstaceUuid.value;
            lastCurText = curText.value;
            const objTree = towxml(allText.substring(finishIndex), "markdown");
            const allNodesSize = objTree.children.length + oldFirstLevelChildNodes.length
            if (allNodesSize >= (_this.data.batchIds.length - 1) * _this.data.batchSize) {
              //当第n个批组件用完了，就创建n+2个批组件，隔代创建，防止batchRenderCb.value[batchNum]为undifined
              const _batchId = Math.trunc(allNodesSize / _this.data.batchSize) + 1
              _this.data.batchIds[_batchId] = _batchId
              _this.setData({
                [`batchIds[${_batchId}]`]:
                  _batchId,
              })
            }
            // console.log("未复用文本长度：", allText.length - finishIndex)
            // console.log("当前finishIndex: ", finishIndex);
            // console.log("当前字符串：\n", allText.substring(finishIndex));
            // console.log("渲染对应的第一个字符：", singleChar);
            // console.log("当前对象数据：", objTree.children);
            if (!flag) {
              flag = true;
              _this.dataNodes = objTree.children;
              _this.setData({ dataNodes: objTree.children });
            } else {
              for (let i = 0; i < objTree.children.length; i++) {
                _this.dataNodes[oldFirstLevelChildNodes.length + i] =
                  objTree.children[i];
                //通过路径的方式，一个个元素地渲染，比直接_this.setData(dataNodes,数组)的方式，效率提高很多
                (function renderNode() {
                  const batchNum = Math.trunc((oldFirstLevelChildNodes.length + i) / _this.data.batchSize)
                  const renderIndex = (oldFirstLevelChildNodes.length + i) % _this.data.batchSize
                  batchRenderCb.value[batchNum](renderIndex, objTree.children[i])
                  // _this.setData({
                  //   [`dataNodes[${oldFirstLevelChildNodes.length + i}]`]:
                  //     objTree.children[i],
                  // });
                })()
              }
              //上一次可能渲染了多余的节点，这次要去掉
              for (
                let x =
                  oldFirstLevelChildNodes.length + objTree.children.length;
                x < _this.dataNodes.length;
                x++
              ) {
                (function renderUnknowNode() {
                  const batchNum = Math.trunc(x / _this.data.batchSize)
                  const renderIndex = x % _this.data.batchSize
                  batchRenderCb.value[batchNum](renderIndex, { tag: "unknow" })
                  // _this.setData({ [`dataNodes[${x}]`]: { tag: "unknow" } });
                })()
              }
            }
            //以下是判断是否可以复用的逻辑，复用的条件就是：当最新的内容转化出来有n个节点，那么只有第n个是可能不完整的，前n-1个是可以复用的
            //allText.substring(finishIndex, allText.length - 1)截至是 allText.length - 1而不是allText.length，是为了避免1. 2.这种有序列表情况触发的问题，因为1，2不是markdown特殊语法字符，但是1. 却是
            const curNewNodes = towxml(
              allText.substring(finishIndex, allText.length - 1),
              "markdown"
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
                    "markdown"
                  );
                  if (tmpNodes.children.length <= curNewNodesNum - 1) {
                    for (let i = 0; i < tmpNodes.children.length; i++) {
                      oldFirstLevelChildNodes.push(objTree.children[i]);
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
            // console.log("textInstaceUuid.value的值", textInstaceUuid.value);
            // console.log("curText.value:");
            // console.log(curText.value);
            // console.log("c - index - 1的值", c - index - 1);
            // console.log("curText.value.length的值", curText.value.length);
            if (textRenderCb.value && singleChar) {
              //产生了新的文本实例，一段连续显示的文本中还没有碰到特殊markdown字符
              if (tmpUuid != textInstaceUuid.value) {
                textRenderCb.value(singleChar);
                return;
              } else {
                //没有产生新的文本实例，一段连续显示的文本中碰到了特殊markdown字符，但是这个特殊字符是正常显示
                if (c - index - 1 === curText.value.length) {
                  textRenderCb.value(singleChar);
                  return;
                }
                //markdown字符串中转义的情况
                if (
                  _this.unescapeMarkdown(allText.substring(index, c - 1))
                    .length === curText.value.length
                ) {
                  textRenderCb.value(singleChar);
                  return;
                }
                //没有产生新的文本实例，一段连续显示的文本中碰到了特殊markdown字符，但是特殊字符不是正常显示，最后那个正常字符确正常显示
                //<think>
                //嗯
                if (
                  c - index - 1 !== curText.value.length &&
                  curText.value === allText[c - 2] &&
                  lastCurText !== curText.value
                ) {
                  textRenderCb.value(singleChar);
                  return;
                }
                //还有一种情况,不做处理：没有产生新的文本实例，一段连续显示的文本中碰到了特殊markdown字符，但是特殊字符不是正常显示，最后那个正常字符确不正常显示，如：
                //# hello
                //```python
              }
            }
          }
        }
      }, _this.data.speed)
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
          console.error('回调函数执行出错:', error);
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
        }
      };
    }
  },
});
