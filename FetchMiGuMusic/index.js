const cheerio = require('cheerio');
const fetch = require('node-fetch');
const fs = require('fs');
const chalk = require('chalk');
const ConsoleGrid = require('console-grid');
const npath = require('path')
let config = require('../config');

class FetchMiGuMusic {
	/**
	 * [constructor 构造涵数]
	 * @param  {String}  options.path    [存储路径]
	 * @param  {String}  options.keyword [搜索关键字]
	 * @param  {Boolean} options.isAsync [是否异步]
	 * @return {[type]}                  [description]
	 */
	constructor({path = './', keyword = '周杰伦', isAsync = false}) {
		// assign key
		Object.assign(this, {path, keyword});
		// isAsync
		this.isAsync = (isAsync === true || isAsync === 'true') ? true : false;
		// 音乐信息
		this.musicInfo = [];
		// 搜索url
		this.searchUrl = `${config.searchUrl}${encodeURIComponent(keyword)}`;
		// 存储路径
		this.path = npath.resolve(this.path, `music-${this.keyword}`);
		// log
		this.optLog();
	}
	/**
	 * [checkIsLogin 检查登录状态]
	 * @return {[type]} [description]
	 */
	async checkIsLogin() {
		let res = await this.handleAsync(this.getDownLink, '检测登录-获取下载链接', config.copyrightId, config.songName, true);
		if (res instanceof Object && res.returnCode !== '000000') {
			console.log(chalk.red(`${res.returnDesc || res.msg}, 执行命令 'f2m login'`));
			return false;
		} else {
			return true;
		}
	}
	/**
	 * [login 登录]
	 * @param  {String} options.username [用户名]
	 * @param  {String} options.password [密码]
	 * @return {[type]}                  [description]
	 */
	static async login({username = '', password = ''}) {
		if (username === '' || password === '') {
			console.log(chalk.red('用户名/密码不能为空'));
			return;
		} else {
			console.log(chalk.red('登录功能开发中..., 打开 http://music.migu.cn/v3 登录完以后, 打开开发者工具把Cookie粘过来写到config.js文件 ~_~'));
		}
	}
	/**
	 * [getCountPages 获取总页数]
	 * @return {[type]} [description]
	 */
	async getCountPages() {
		console.log(this.printEmbellish('开始获取总页数'));
		let date = Date.now(),
			htmlText = await this.fetchHtml(this.searchUrl),
			$ = cheerio.load(htmlText),
			lastPage = 1;
		$('.tab-content .page a').each((k, v) => {
			let curPage = +$(v).text();
			if (lastPage < curPage) {
				lastPage = curPage;
			}
		});
		console.log(`共有${chalk.green(lastPage)}页\n`);
		// log - getCountPages
		this.optLog('getCountPages', Date.now() - date);
		return lastPage;
	}
	/**
	 * [getMusicInfo 开始获取音乐信息]
	 * @param  {[type]} url [url]
	 * @return {[type]}     [description]
	 */
	async getMusicInfo(url) {
		let htmlText = await this.fetchHtml(url),
			$ = cheerio.load(htmlText),
			musicInfo = [],
			proArr = [],
			_this = this;
		$('.songlist-item').each((k, v) => {
			let fun = async () => {
				let $a = $(v).find('.song-name span a'),
					arr = $a.attr('href') ? $a.attr('href').split('/') : '',
					copyrightId = (arr instanceof Array) ? arr.pop() : '';
				if (copyrightId) {
					musicInfo.push({
						songName: $a.text(),
						songAlbum: $(v).find('.song-album a').text(),
						copyrightId,
						downUrl: await this.getDownLink(copyrightId, $a.text()),
						downStatus: false
					})
				}
			}
			proArr.push(this.isAsync ? fun() : fun);
		});
		for (let v of proArr) {
			if (this.isAsync) {
				await v;
			} else {
				await v();
			}
			// await this.isAsync ? v : v();
		}
		return musicInfo;
	}
	/**
	 * [handleAsync 处理异步]
	 * @param  {[type]}  asyncFun [异步方法]
	 * @param  {String}  desc     [描述]
	 * @param  {Array}   args     [参数]
	 * @return {[type]}           [description]
	 */
	async handleAsync(asyncFun, desc = '', ...args) {
		let res;
		try {
			res = await asyncFun.call(this, ...args);
		} catch(e) {
			console.log(e);
			res = 'error';
		}
		if (res === 'error') {
			try {
				fs.rmdirSync(this.path);
			} catch(e) {
				console.log(chalk.red('删除文件夹失败'));
			}
			throw String(chalk.red(`${desc}异常~`));
		} else {
			return res;
		}
	}
	/**
	 * [downMusic 下载音乐]
	 * @return {[type]} [description]
	 */
	async downMusic() {
		// 检测keyword
		if (this.keyword === '') {
			console.log(chalk.red('keyword 不能为空'));
			return;
		}
		// 检测是否登录
		if (!await this.handleAsync(this.checkIsLogin, '检测登录')) return;

		// 创建存储文件夹
		if (!this.createFolder()) return;

		// log - 开始日期
		this.optLog('startDate', Date.now());
		let countPage = await this.handleAsync(this.getCountPages, '获取页数'),
			date = Date.now();

		// 开始获取下载链接
		console.log(this.printEmbellish('开始获取音乐信息', 14));
		for (let i = 1; i <= countPage; i++) {
			console.log(`开始获取第${chalk.green(i)}页音乐信息\n`);
			let arr = await this.getMusicInfo(`${this.searchUrl}${+i > 1 ? '&page=' + i : ''}`).catch((e) => {
				console.log(e);
				return []
			});
			this.musicInfo.push(...arr);
			console.log(`\n获取第${i}页音乐信息完毕, 共有${chalk.green(arr.length)}个下载链接\n`);
		}

		// log - getMusicInfo
		this.optLog('getMusicInfo', Date.now() - date);

		// 开始下载
		console.log(this.printEmbellish('开始下载音乐', 16));
		await this.startDown();
		console.log('\n', this.printEmbellish('音乐下载完成', 16));

		// 显示日志
		this.showLog();
	}
	/**
	 * [startDown 开始下载]
	 * @return {[type]} [description]
	 */
	async startDown() {
		let proArr = [],
			date = Date.now();
		for (let v of this.musicInfo) {
			if (v.downUrl) {
				let fun = async () => {
					console.log(`${chalk.green('开始下载歌曲'+ chalk.bold(chalk.blue(v.songName)))}`);
					await fetch(v.downUrl)
						.then(res => {
							const dest = fs.createWriteStream(`${this.path}/${v.songName}.mp3`);
							res.body.pipe(dest);
							v.downStatus = true;
							console.log(`${chalk.green('下载歌曲'+ chalk.bold(chalk.blue(v.songName)) +'成功')}`);
						})
						.catch((e) => {
							console.log(`${chalk.red('下载歌曲'+ chalk.bold(chalk.blue(v.songName)) +'失败')}`);
						})
				}
				proArr.push(this.isAsync ? fun() : fun);
			}
		}
		for (let v of proArr) {
			if (this.isAsync) {
				await v;
			} else {
				await v();
			}
		}
		// opt - downMusic
		this.optLog('downMusic', Date.now() - date);
	}
	/**
	 * [createFolder 创建存储文件夹]
	 * @return {[type]} [description]
	 */
	createFolder() {
		let errorTxt = '';
		try {
			if (!fs.existsSync(this.path)) {
				fs.mkdirSync(this.path);
			} else {
				errorTxt = `${this.path} 已经存在`;
			}
		} catch (e) {
			errorTxt = '创建文件夹失败';
		}
		return errorTxt ? console.log(chalk.red(errorTxt)) : true;
	}
	/**
	 * [printEmbellish 打印添加修饰]
	 * @param  {[type]} content   [内容]
	 * @param  {String} qualifier [修饰符]
	 * @param  {Number} repeat    [重复数]
	 * @return {[type]}           [description]
	 */
	printEmbellish(content, repeat = 15, qualifier = '-') {
		return chalk.green(`${qualifier.repeat(repeat)}${content}${qualifier.repeat(repeat)}\n`);
	}
	/**
	 * [optLog 操作日志]
	 * @param  {[type]} key [key]
	 * @param  {[type]} val [val]
	 * @return {[type]}     [description]
	 */
	optLog(key, val) {
		if (!('logs' in this)) {
			this.logs = {
				startDate: {
					isShow: false,
					desc: '开始下载时间',
					date: 0
				},
				endDate: {
					isShow: false,
					desc: '结束下载时间',
					date: 0
				},
				getCountPages: {
					isShow: true,
					desc: '获取总页数',
					date: 0
				},
				getMusicInfo: {
					isShow: true,
					desc: '获取音乐信息',
					date: 0
				},
				downMusic: {
					isShow: true,
					desc: '下载音乐',
					date: 0
				}
			};
			return;
		}
		if (key in this.logs) this.logs[key].date = val;
	}
	/**
	 * [showLog 显示下载日志]
	 * @return {[type]} [description]
	 */
	showLog() {
		// opt - endDate
		this.optLog('endDate', Date.now());
		// down table config
		let down = {
				option: {
					sortField: "name"
				},
				columns: [{
					id: "songName",
					name: "歌曲名称",
					type: "string",
					maxWidth: 100
				}, {
					id: "songAlbum",
					name: "专辑",
					type: "string",
					maxWidth: 100
				}, {
					id: "downStatus",
					name: "下载状态(Y/N)",
					type: "string",
					maxWidth: 100
				}],
				rows: []
			},
			// log table config
			log = {
				columns: [{
					id: "allSong",
					name: "歌曲总数",
					type: "string",
					maxWidth: 100
				}, {
					id: "ySong",
					name: "下载成功数",
					type: "string",
					maxWidth: 100
				}, {
					id: "nSong",
					name: "下载失败数",
					type: "string",
					maxWidth: 100
				}, {
					id: "rate",
					name: "下载成功率(%)",
					type: "string",
					maxWidth: 100
				}, {
					id: "allTime",
					name: "总用时(秒)",
					type: "string",
					maxWidth: 100
				}],
				rows: [{
					allSong: this.musicInfo.length,
					ySong: this.musicInfo.filter((v) => v.downStatus).length,
					nSong: this.musicInfo.filter((v) => !v.downStatus).length,
					allTime: `${(this.logs.endDate.date - this.logs.startDate.date) / 1000}秒`
				}]
			}
		// down rows
		for (let v of this.musicInfo) {
			down.rows.push({
				songName: v.songName,
				songAlbum: v.songAlbum,
				downStatus: v.downStatus ? 'Y' : 'N'
			})
		}
		// log columns
		for (let [k, v] of Object.entries(this.logs)) {
			if (v.isShow) {
				log.columns.push({
					id: k,
					name: `${v.desc}用时(秒)`,
					type: "string",
					maxWidth: 100
				});
				log.rows[0][k] = `${v.date / 1000}`;
			}
		}
		log.columns.push(...log.columns.splice(4, 1));
		// log rows
		log.rows[0].rate = (log.rows[0].ySong / log.rows[0].allSong).toFixed(2) * 100;
		// render down
		new ConsoleGrid().render(down);
		// render log
		new ConsoleGrid().render(log);
		// exit
		process.exit(0);
	}
	/**
	 * [getDownLink 获取下载链接]
	 * @param  {[type]}  copyrightId [版本id]
	 * @param  {[type]}  songName    [歌曲名称]
	 * @param  {Boolean} isCheck      [是否检测]
	 * @return {[type]}              [description]
	 */
	async getDownLink(copyrightId, songName, isCheck = false) {
		consoleLog(`${chalk.green('开始获取歌曲'+ chalk.bold(chalk.blue(songName)) +'下载地址')}`);
		let dlink = '',
			errorTxt = `${chalk.red('获取歌曲'+ chalk.bold(chalk.blue(songName)) +'下载地址失败')}`;

		// console log
		function consoleLog(text = '') {
			!isCheck && console.log(text);
		}

		// check copyrightId
		if (!copyrightId) {
			return dlink;
		}

		// init params
		const {URLSearchParams} = require('url');
		const params = new URLSearchParams();
		params.append('copyrightId', copyrightId);
		params.append('payType', '01');
		params.append('type', 1);
		config.postHeader.body = params;

		// fetch download link
		await fetch('http://music.migu.cn/v3/api/order/download', config.postHeader)
			.then(res => res.json())
			.then(data => {
				if (data.returnCode === '000000' && data.returnDesc === '恭喜您！验证成功！请在浏览器中完成下载') {
					dlink = data.downUrl;
					consoleLog(`${chalk.green('获取歌曲'+ chalk.bold(chalk.blue(songName)) +'下载地址成功')}`)
				} else {
					consoleLog(errorTxt)
					if (isCheck) dlink = data;
				}
			}).
		catch((e) => {
			consoleLog(e, errorTxt)
		});

		return dlink;
	}
	/**
	 * [fetchHtml 获取html页面]
	 * @param  {[type]} url [url]
	 * @return {[type]}     [description]
	 */
	async fetchHtml(url) {
		return await fetch(url, config.getHeaders)
			.then(res => res.text())
			.then(body => body)
			.catch((e) => {
				console.log(e);
				throw new Error('获取页面异常');
			})
	}
}

exports.FetchMiGuMusic = FetchMiGuMusic;