const cheerio = require('cheerio');
const fetch = require('node-fetch');
const fs = require('fs');
const chalk = require('chalk');
const ConsoleGrid = require('console-grid');
const npath = require('path')
let config = require('../config');

class FetchMiGuMusic {
	constructor({path = './', keyword = '周杰伦', isAsync = false}) {
		Object.assign(this, {path, keyword, isAsync});
		this.musicInfo = [];
		this.searchUrl = `${config.searchUrl}${encodeURIComponent(keyword)}`;
		this.path = npath.resolve(this.path, `music-${this.keyword}`);
		this.optLog();
	}
	async checkIsLogin() {
		let res = await this.getDownLink(config.copyrightId, config.songName, true);
		if (res instanceof Object && res.returnCode !== '000000') {
			console.log(chalk.red(`${res.returnDesc || res.msg}, 执行命令 'f2m login username password'`));
			return false;
		} else {
			return true;
		}
	}
	static async login({username = '', password = ''}) {
		if (username === '' || password === '') {
			console.log(chalk.red('用户名/密码不能为空'));
			return;
		} else {
			console.log(chalk.red('登录功能开发中..., 打开 http://music.migu.cn/v3 登录完以后, 打开开发者工具把Cookie粘过来写到config.js文件 ~_~'));
		}
	}
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
		this.logs.getCountPages.date = Date.now() - date;
		return lastPage;
	}
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
	async downMusic() {
		if (!await this.checkIsLogin()) return;
		if (!this.createFolder()) return;
		let countPage = await this.getCountPages(),
			date = Date.now();
		console.log(this.printEmbellish('开始获取下载链接'));
		for (let i = 1; i <= countPage; i++) {
			console.log(`开始获取第${chalk.green(i)}页下载链接\n`);
			let arr = await this.getMusicInfo(`${this.searchUrl}${+i > 1 ? '&page=' + i : ''}`);
			this.musicInfo.push(...arr);
			console.log(`获取第${i}页下载链接完毕, 共有${chalk.green(arr.length)}个下载链接\n`);
		}
		this.logs.getMusicInfo.date = Date.now() - date;
		console.log(this.printEmbellish('开始下载音乐'));
		await this.startDown();
		console.log(this.printEmbellish('下载完成'));
		this.showLog();
	}
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
		this.logs.downMusic.date = Date.now() - date;
	}
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
	printEmbellish(content, qualifier = '-', repeat = 15) {
		return chalk.green(`${qualifier.repeat(repeat)}${content}${qualifier.repeat(repeat)}\n`);
	}
	optLog(key, val) {
		if (!('logs' in this)) {
			this.logs = {
				startDate: {
					desc: '开始下载时间',
					date: 0
				},
				endDate: {
					desc: '结束下载时间',
					date: 0
				},
				getCountPages: {
					desc: '获取总页数',
					date: 0
				},
				getMusicInfo: {
					desc: '获取音乐信息',
					date: 0
				},
				downMusic: {
					desc: '下载音乐',
					date: 0
				}
			};
			return;
		}
		if (key in this.logs) this.logs[key].date = val;
	}
	showLog() {
		this.logs.endDate = Date.now();
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
					allTime: `${(this.logs.endDate - this.logs.startDate) / 1000}秒`
				}]
			}
		for (let v of this.musicInfo) {
			down.rows.push({
				songName: v.songName,
				songAlbum: v.songAlbum,
				downStatus: v.downStatus ? 'Y' : 'N'
			})
		}
		for (let [k, v] of Object.entries(this.logs)) {
			if (typeof v === 'object') {
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
		log.rows[0].rate = (log.rows[0].ySong / log.rows[0].allSong).toFixed(2) * 100;
		new ConsoleGrid().render(down);
		new ConsoleGrid().render(log);
		process.exit(0);
	}
	async getDownLink(copyrightId, songName, isTest = false) {
		console.log(`${chalk.green('开始获取歌曲'+ chalk.bold(chalk.blue(songName)) +'下载地址')}`);
		let dlink = '',
			errorTxt = `${chalk.red('获取歌曲'+ chalk.bold(chalk.blue(songName)) +'下载地址失败')}`;
		if (!copyrightId) {
			return dlink;
		}

		const {
			URLSearchParams
		} = require('url');

		const params = new URLSearchParams();
		params.append('copyrightId', copyrightId);
		params.append('payType', '01');
		params.append('type', 1);

		config.postHeader.body = params;

		await fetch('http://music.migu.cn/v3/api/order/download', config.postHeader)
			.then(res => res.json())
			.then(data => {
				if (data.returnCode === '000000' && data.returnDesc === '恭喜您！验证成功！请在浏览器中完成下载') {
					dlink = data.downUrl;
					console.log(`${chalk.green('获取歌曲'+ chalk.bold(chalk.blue(songName)) +'下载地址成功')}`);
				} else {
					console.log(errorTxt);
					if (isTest) dlink = data;
				}
			}).
		catch((e) => {
			console.log(`${e} ${errorTxt}`);
		});
		return dlink;
	}
	async fetchHtml(url) {
		return await fetch(url, config.getHeaders)
			.then(res => res.text())
			.then(body => body)
	}
}

exports.FetchMiGuMusic = FetchMiGuMusic;