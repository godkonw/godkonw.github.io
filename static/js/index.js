var nebulas = require("nebulas"),
    NebPay = require("nebpay"),
    HttpRequest = nebulas.HttpRequest,
    Neb = nebulas.Neb,
    Account = nebulas.Account,
    Transaction = nebulas.Transaction,
    Unit = nebulas.Unit,
    Utils = nebulas.Utils;


var chainnetConfig = {
    mainnet: {
        name:"主网",
        contractAddress: "n1hucv9cg7tr8y39kCis6E1LfFqHvB5YhAu",
        txhash: "35dc4bb0cd3a960e49da3f8bb047a4546fb9edb2bc5f5555aab820954a0274d9",
        host: "https://mainnet.nebulas.io"
    },
    testnet: {
        name:"测试网",
        contractAddress: "n1hucv9cg7tr8y39kCis6E1LfFqHvB5YhAu",
        txhash: "35dc4bb0cd3a960e49da3f8bb047a4546fb9edb2bc5f5555aab820954a0274d9",
        host: "https://testnet.nebulas.io"
    }
}

var chain = localStorage.getItem("chain")||"mainnet"
var chainInfo = chainnetConfig[chain]

var neb = new Neb();
neb.setRequest(new HttpRequest(chainInfo.host));

var nasApi = neb.api;
//支付接口
var nebPay = new NebPay();


function mylog() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift("cat-->")
    console.log.apply(console, args);
}

function getErrMsg(err) {

    var msg = ""
    if (err == 'Error: 10000') {
        msg = "竞猜答案最少必须是2位数"
    }else if (err == 'Error: 403') {
        msg = "权限禁止"
    } else if (err == 'Error: 10001') {
        msg = "交易额必须大于等于竞猜 NAS"
    } else if (err == 'Error: 10002') {
        msg = "offset参数错误"
    } else if (err == 'Error: 10003') {
        msg = "竞猜详情未找到"
    } else if (err == 'Error: 10004') {
        msg = "密码错误"
    } else if (err == 'Error: 10005') {
        msg = "答案错误"
    } else if (err == 'Error: 10006') {
        msg = "此游戏已完成"
    } else if (err == 'Error: 10007') {
        msg = "超过尝试次数"
    } else if (err == 'Error: 10008') {
        msg = "游戏配置获取失败"
    } else if (err == 'Error: 10009') {
        msg = "不能参加自己发布的游戏"
    } else if (err == 'Error: 10010') {
        msg = "此游戏已过期"
    } else if (err == 'Error: 10011') {
        msg = "参数包含非法标签"
    } else if (err == 'Error: 10012') {
        msg = "number参数错误"
    } else if (err == 'Error: 10013') {
        msg = "猜中奖励 NAS 数量参数错误"
    } else if (err == 'Error: 10014') {
        msg = "发布时最小 NAS 错误"
    } else if (err == 'Error: 10015') {
        msg = "未结束，不能取回 NAS"
    } else if (err == 'Error: 10016') {
        msg = "已取回 NAS"
    }else {
        msg = "系统异常"
    }
    return msg
}

var GuessDetailComponent = {
    template: '#guess-detail-tpl',
    watch: {
        '$parent.nebState': function () {
            this.fetchDetail()
        }
    },
    methods: {
        playGuessDialog: function () {
            this.dialogVisible = true
        },
        verifyNumber: function () {
            var _this = this;
            if (!this.$parent.nebState) {
                _this.$message.error("获取节点状态失败！")
                return
            }

            if(!this.$parent.nebState){
                _this.$message.error("获取钱包状态失败,请重试！")
                return
            }

            var args = [_this.hash, _this.playGuess]

            var data = {
                address: _this.$parent.contractAddress,
                value: 0,
                func: "verifyNumber",
                data: args,
                context: _this,
                successMsg: "恭喜你回答正确！",
                successFunc: function (resp) {

                    debugger;

                    _this.dialogVisible = false;

                    _this.fetchDetail()

                    _this.$message.success("恭喜你猜中答案，区块可能还在打包！请稍后查看余额和中奖状态！")

                },
                failFunc : function (resp) {

                    // var m = resp.message
                    // _this.$message.error(getErrMsg(m))
                }
            }

            _this.$eventHub.$emit("nebPayCall", data)
        },
        submitForm: function (formName) {
            var _this = this

            this.$refs[formName].validate(function (valid) {
                if (valid) {
                    _this.verifyNumber()
                } else {
                    _this.$message.error("表单验证错误！")
                    return false;
                }
            });
        },
        fetchDetail: function () {

            debugger;

            var _this = this;
            if (!this.$parent.nebState) {
                _this.$message.error("获取节点状态失败！")
                return
            }

            var contractAddress = this.$parent.contractAddress
            // var nonce = this.$parent.getNonce()

            nasApi.call({
                chainID: this.$parent.nebState.chain_id,
                from: this.$parent.address || contractAddress,
                to: contractAddress,
                value: 0,
                // nonce: nonce,
                gasPrice: 1000000,
                gasLimit: 2000000,
                contract: {
                    function: "getGuess",
                    args: JSON.stringify([this.hash])
                }
            }).then(function (resp) {
                // console.log(resp)
                _this.loading = false
                if (resp.error) {
                    return
                }
                if (resp.execute_err) {
                    return _this.$message.error(resp.execute_err)
                }
                var result = resp.result
                var data = JSON.parse(result)
                if (!data) {
                    _this.$message.warning("未找到此游戏，可能是因为区块还属于 pending 状态！")
                    return
                }
                _this.guess = data
                if (data.needPasswd) {
                    _this.playGuessRules.passwd = {
                        required: true,
                        message: '必须输入密码',
                        trigger: 'blur'
                    }
                }
            })
        }
    },
    created: function () {
        this.fetchDetail()
    },
    data: function () {
        var hash = this.$route.params.id
        return {
            loading: true,
            dialogVisible: false,
            playGuessRules: {
                number: {
                    required: true,
                    trigger: 'blur'
                },
            },
            playGuess: {
                number: "",
                passwd: "",
            },
            guess: {
                "hash": "",
                "author": "",
                "showDigits": false,
                "title": "",
                "tips": "",
                "maxTry": 0,
                "nas": 0,
                "created": 0,
                "endTime": 1525881600,
                "success": null,
                "playUsers": 0,
                "needPasswd": false,
                "sendNas": 0.1,
                "config": null

            },
            hash: hash,
        }
    }
}

var AddComponent = {
    template: '#add-tpl',
    methods: {
        addGuess: function () {
            var _this = this;
            if (!this.$parent.nebState) {
                _this.$message.error("获取节点状态失败！")
                return
            }

            if(!this.$parent.address){
                _this.$message.error("获取钱包失败，请按照官方钱包插件！")
                return
            }

            var args = [_this.form]

            var data = {
                address: _this.$parent.contractAddress,
                value: _this.form.nas,
                func: "save",
                data: args,
                context: _this,
                successMsg: "添加游戏成功！",
                successFunc: function (resp) {

                    if (resp.hash) {
                        _this.$message.success("添加游戏成功!")
                        _this.$router.push({
                            name: "guessDetail",
                            params: {
                                id: resp.hash
                            }
                        })
                    }

                }
            }

            _this.$eventHub.$emit("nebPayCall", data)

        },
        submitForm: function (formName) {
            var _this = this,
                endDateTime = this.endDateTime,
                now = new Date();
            if (endDateTime < now) {
                _this.$message.error("结束时间不能小于当前时间！")
                return
            }
            _this.form.endTime = endDateTime.getTime() / 1000

            this.$refs[formName].validate(function (valid) {
                if (valid) {
                    _this.addGuess()
                } else {
                    _this.$message.error("表单验证错误！")
                    return false;
                }
            });
        },
    },
    watch: {
        "$parent.account": function (n, o) {
            this.account = n
        },
        "$parent.balance": function (n, o) {
            this.balance = n
        },
    },
    data: function () {
        return {
            needPasswd: false,
            endDateTime: null,
            account: this.$parent.account,
            balance: this.$parent.balance,
            rules: {
                title: {
                    required: true,
                    message: '必须输入猜谜标题',
                    trigger: 'blur'
                },
                number: [{
                    required: true,
                    message: '必须输入谜底',
                    trigger: 'blur'
                }, ],
                nas: [{
                    required: true,
                    type: "number",
                    min: 0.0001,
                    message: '最小必须为 0.0001',
                    trigger: 'blur'
                }, ],
                maxTry: {
                    required: true,
                    type: "number",
                    min: 1,
                    message: '最小必须为1次',
                    trigger: 'blur'
                },
            },
            form: {
                title: '',
                number: '',
                nas: 0.1,
                maxTry: 1,
                showDigits: false,
                passwd: "",
                endTime: 0,
                tips: ""
            }
        }
    }
}

var AboutComponent = {
    template: '#about-tpl'
}

var HomeComponent = {
    template: '#home-tpl',
    props: ['currentPage'],
    created: function () {
        this.fetchGuessList()
    },
    filters: {
        withdrawText: function (item) {
            var text = "取回NAS"
            if (item.config && item.config.retrieve) {
                text = "已取回"
            }
            return text
        }
    },
    watch: {
        "currentPage": function (n, o) {
            this.guessList = []
            this.loading = true
            this.fetchGuessList()
        },
        "activeTab": function () {
            this.loading = true
            this.offset = -1
            this.total = -1
            this.guessList = []
            this.fetchGuessList()
        },
        "$parent.nebState": function (n, o) {
            if (n) {
                this.fetchGuessList()
            }
        },
        "$parent.account": function (n, o) {
            this.fetchGuessList()
        }
    },
    methods: {
        withdrawGuess: function (item) {
            var _this = this;
            var contractAddress = this.$parent.contractAddress

            if (!this.$parent.nebState) {
                return false
            }


            var args = [item.hash]

            var data = {
                address: _this.$parent.contractAddress,
                value: 0,
                func: "withdrawGuess",
                data: args,
                context: _this,
                successMsg: "提现！",
                successFunc: function (resp) {

                    _this.$alert('hash:' + resp.hash, '交易结果', {
                        confirmButtonText: '确定'
                    });

                },
                failFunc : function (resp) {

                    // var m = resp.message
                    // _this.$message.error(getErrMsg(m))
                }
            }

            _this.$eventHub.$emit("nebPayCall", data)

            return false
        },
        handleTabClick: function (tab) {
            // console.log(this.activeTab)
            this.fetchGuessList()
        },
        loadmore: function () {
            this.loadmoreYes = true
            this.loadmoreText = "加载中"

            if (this.offset == -1) {
                this.offset = this.total
            }
            this.offset = this.offset - this.limit

            if (this.offset == -1) {
                this.offset = 0
            }
            this.fetchGuessList()
        },
        fetchGuessList: function () {
            // console.log("fetchGuessList", this.currentPage)
            var func = "forEach";

            if (this.currentPage == "my") {
                func = "getAddressGuess"

                if (this.activeTab == "myPlay") {
                    func = "getPlayedGuess"
                }
            }
            var _this = this;
            var contractAddress = this.$parent.contractAddress

            if (!this.$parent.nebState) {
                return
            }

            // if (func == "getAddressGuess" || func == "getPlayedGuess") {
            //     //需要加载钱包信息
            //     if (!this.$parent.account) {
            //         this.$parent.unlockWallectVisible = true
            //         return
            //     }
            // }
            // var nonce = this.$parent.getNonce()
            nasApi.call({
                chainID: this.$parent.nebState.chain_id,
                from: this.$parent.address  ||
                    contractAddress,
                to: contractAddress,
                value: 0,
                // nonce: nonce,
                gasPrice: 1000000,
                gasLimit: 2000000,
                contract: {
                    function: func,
                    args: JSON.stringify([this.limit, this.offset])
                }
            }).then(function (resp) {
                // var resp = JSON.parse(resp)
                // console.log(resp)
                _this.loading = false
                if (resp.error) {
                    return
                }
                if (resp.execute_err) {
                    return _this.$message.error(resp.execute_err)
                }
                var result = resp.result
                var data = JSON.parse(result)
                //console.log(data)
                _this.guessList = _this.guessList.concat(data.guess)
                _this.total = data.total

                _this.loadmoreYes = false
                if (!data.guess.length) {
                    _this.loadmoreText = "没有更多数据"
                } else {
                    _this.loadmoreText = "加载更多"
                }


            }).catch(function (e) {
                _this.$message.error(e.message);
            });
        }
    },
    data: function () {
        return {
            loading: true,
            guessList: [],
            activeTab: "myPost",
            total: -1,
            offset: -1,
            limit: 9,
            loadmoreYes: false,
            loadmoreText: "加载更多"
        }
    }
}

var routes = [{
        path: '/',
        component: HomeComponent,
        name: "home",
        props: {
            "currentPage": "home"
        }
    },
    {
        path: '/my',
        component: HomeComponent,
        name: "myGuess",
        props: {
            "currentPage": "my"
        }
    },
    {
        path: '/add',
        component: AddComponent
    },
    {
        path: '/hash/:id',
        component: GuessDetailComponent,
        name: "guessDetail"
    },
    {
        path: '/about',
        component: AboutComponent
    },
]

var router = new VueRouter({
    routes: routes
})

var Main = {
    router: router,
    created: function () {

        //获取钱包状态
        this.fetchNebState()

        this.getWallectInfo();
        this.messageListener();

    },
    methods: {
        getWallectInfo: function () {
            window.postMessage({
                "target": "contentscript",
                "data": {},
                "method": "getAccount",
            }, "*");
        },
        messageListener: function () {
            var _this = this
            window.addEventListener('message', function (e) {
                if (e.data && e.data.data) {
                    if (e.data.data.account) {

                        _this.address = e.data.data.account
                        mylog("address:", _this.address)
                        // _this.updateUserInfo()
                    }
                }
            })
        },
        getNonce: function () {
            if (!this.accountState) {
                this.fetchAccountState()
                this.unlockWallectVisible = true
                throw new Error("nonce获取错误，请加载钱包文件");
                return
            }
            this.accountState.nonce = this.accountState.nonce * 1 + 1
            return this.accountState.nonce
        },
        changChain: function (chain) {
            if (chain == "mainnet") {
                this.chainStr = "主网"
            } else if (chain == "testnet") {
                this.chainStr = "测试网"
            }
            this.chain = chain
            localStorage.setItem("chain", chain)
            location.reload()
        },
        fetchAccountState: function () {

            var _this = this;

            if (!_this.address) {
                return
            }
            this.nasApi.getAccountState({
                address: this.address
            }).then(function (resp) {
                if (resp.error) {
                    throw new Error(resp.error);
                }
                var amount = Unit.fromBasic(Utils.toBigNumber(resp.balance), "nas").toNumber()
                app.balance = amount

                _this.disabledUnlock = false
                _this.unlockText = "解锁"
                _this.loadingAccountState = false
                _this.accountState = resp
            });
        },
        fetchNebState: function () {
            var _this = this
            this.nasApi.getNebState().then(function (state) {
                _this.nebState = state
            })
        },
        handleSelect: function (item) {},
        handleClose: function (done) {
            done();
            this.unlockWallectVisible = false
        },
        onUnlockFile: function () {
            var _this = this
            try {
                this.account.fromKey(this.mFileJson, this.walletPasswd);
                this.unlockWallectVisible = false
            } catch (e) {

                _this.$message.error("keystore 文件错误, 或者密码错误")
            }

        },
        walletFile: function (file) {
            var _this = this
            this.needPwd = true

            var fr = new FileReader();
            fr.onload = onload;
            fr.readAsText(file.raw);

            function onload(e) {
                try {
                    mFileJson = JSON.parse(e.target.result);
                    mAccount = Account.fromAddress(mFileJson.address)
                    _this.mFileJson = mFileJson
                    _this.account = mAccount
                    _this.unlockText = "获取账号状态"
                    _this.loadingAccountState = true
                    _this.fetchAccountState()

                } catch (e) {
                    _this.$message.error(e.message)
                }
            }

        }
    },
    data: function () {
        return {
            mFileJson: null,
            mAccount: null,
            unlockWallectVisible: false,
            loadingAccountState: false,
            disabledUnlock: true,
            unlockText: "解 锁",
            needPwd: false,
            walletPasswd: "",
            visible: true,
            nasApi: nasApi,
            activeIndex: 1,
            balance: 0,
            account: null,
            nebState: null,
            accountState: null,
            contractAddress:chainInfo.contractAddress,
            chainnetConfig: chainnetConfig,
            chainStr: chainInfo.name,
            chainnet: chain,
            address :""

        }
    }
}


Vue.prototype.$eventHub = new Vue({
    created: function () {
        this.$on("checkTransaction", this.checkTransaction)
        this.$on("nebPayCall", this.nebPayCall)
    },
    methods: {
        fetchDonateStat: function () {
            var _this = this
            mainnetNebApiCall({
                chainID: nebState.chain_id,
                from: app.address || chainInfo.contractAddress,
                to: chainInfo.contractAddress,
                value: "0",
                // nonce: nonce,
                gasPrice: "1000000",
                gasLimit: "2000000",
                contract: {
                    function: "stat",
                    args: JSON.stringify([])
                }
            }).then(function (resp) {
                var result = JSON.parse(resp.result)
                _this.stat = result
            })
        },
        nebPayCall: function (config) {
            var options = config.options || {},
                serialNumber = "",
                _this = this;
            if (!options.callback) {
                options.callback = chainInfo.payhost
            }

            if (!options.listener) {
                options.listener = function (value) {
                    // mylog("listener:", value, serialNumber)
                    // console.log(value)
                    if (typeof value == 'string') {
                        _this.$notify({
                            title: '错误',
                            message: '用户取消了交易！',
                            duration: 3000,
                            type: 'error'
                        });
                        return
                    }

                    config.serialNumber = serialNumber
                    config.txhash = value.txhash

                    config.transStateNotify = _this.$notify({
                        title: '正在获取交易状态',
                        message: '如你不想等待状态查询，可点击关闭按钮。稍后刷新页面查看最新信息！',
                        duration: 0,
                        type: 'warning'
                    });

                    _this.checkTransaction(config)

                    // this.$eventHub.$emit("checkTransaction", config)
                }
            }
            config.options = options


            serialNumber = nebPay.call(
                config.address,
                config.value,
                config.func,
                JSON.stringify(config.data),
                options
            );

            console.log("生成的serialNumber：", serialNumber)
        },
        checkTransaction: function (config) {
            // var config = {
            //     serialNumber:serialNumber,
            //     successMsg:"更新信息成功",
            //     successFunc:this.xxxxx,
            //     context: this
            // }
            var serialNumber = config.serialNumber,
                context = config.context,
                minInterval = 6,
                intervalTime = config.intervalTime || minInterval,
                timeOut = config.timeOut || 60; //60秒后超时
            if (intervalTime < minInterval) { //API限制每分钟最多查询6次
                intervalTime = minInterval
            }
            var timeOutId = 0
            var timerId = setInterval(function () {
                // mylog("查询：", serialNumber)
                var req
                if (config.options.useMainnet) {
                    req = mainnetNebApiCall({
                        hash: config.txhash
                    }, context, '/v1/user/getTransactionReceipt')
                } else {
                    req = nasApi.getTransactionReceipt({
                        hash: config.txhash
                    })
                }
                req.then(function (receipt) {
                    // status Transaction status, 0 failed, 1 success, 2 pending.
                    // mylog("receipt:",receipt)

                    if (receipt.status === 1) {

                        debugger;

                        clearInterval(timerId)
                        config.transStateNotify.close()

                        if (timeOutId) {
                            clearTimeout(timeOutId)
                        }

                        if (config.successMsg) {
                            // context.$message.success(config.successMsg)
                            context.$notify({
                                title: '操作成功',
                                message: config.successMsg,
                                type: 'success'
                            });

                        }
                        // mylog(context)
                        if (config.successFunc) {
                            setTimeout(function () {
                                config.successFunc(receipt)
                            }, 300)

                        }
                    } else if (receipt.status === 0) { //错误

                        debugger;

                        // "Error: 10008"
                        context.$message.error(getErrMsg(receipt.execute_result))
                        clearInterval(timerId)
                        config.transStateNotify.close()

                        if (timeOutId) {
                            clearTimeout(timeOutId)
                        }

                        if (config.failFunc) {
                            setTimeout(function () {
                                config.failFunc(receipt)
                            }, 300)

                        }
                    }
                }).catch(function (err) {
                    debugger;

                    context.$message.error("查询交易结果发生了错误！" + err)
                });
            }, intervalTime * 1000)
            timeOutId = setTimeout(function () {
                config.transStateNotify.close()
                if (timerId) {
                    context.$message.error("查询超时！请稍后刷新页面查看最新内容！")
                    clearInterval(timerId)
                }
            }, timeOut * 1000)
        }
    }
});



Vue.filter("dateFormat", function (value) {
    var date = new Date(value * 1000)
    return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
})

Vue.filter("guessStatus", function (item) {
    item.status = "normal"
    item.statusText = "正在进行"

    

    if (item.success) {
        item.status = "success"
        item.statusText = "已完成"

        if (app.account && item.success.author == app.account.getAddressString()) {
            item.statusText = "已中奖"
        }
        return
    }

    var date = new Date(item.endTime * 1000),
        now = new Date();

    if (date < now) {
        item.expired = true
        item.status = "expired"
        item.statusText = "已结束"
        return
    }
    return
})
var Ctor = Vue.extend(Main)
var app = new Ctor()
app.$mount('#app')