const {
  batchRenderCb
} = require("./batch-cb");
Component({
  options: {
    styleIsolation: "shared",
  },
  properties: {
    batchId: {
      type: Number,
      value: 0,
    }
  },
  lifetimes: {
    ready: function () {
      console.log(`创建了batch${this.data.batchId}`)
      const _this = this
      batchRenderCb.value[this.data.batchId] = (index, node) => {
        _this.data.batchNodes[index] = node
        _this.setData({
          [`batchNodes[${index}]`]:
           node
        });
      };
    },
  },
  data: {
    batchNodes:[]
  },
  methods: {
  },
});
