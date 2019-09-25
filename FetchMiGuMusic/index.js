const cheerio = require('cheerio');
const fetch = require('node-fetch');
const fs = require('fs');
const chalk = require('chalk');
const ConsoleGrid = require('console-grid');

class FetchMiGuMusic {
	constructor(path = './', keyword = '周杰伦', isAsync = false) {
		Object.assign(this, {path, keyword, isAsync});
		console.log(this);
		this.baseUrl = `http://music.migu.cn/v3/search/?keyword=${encodeURIComponent(this.keyword)}`;
		this.musicInfo = [];
		this.logs = {
			startDate: Date.now(),
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
		this.config = {
			"credentials": "include",
			"headers": {
				"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
				"accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh-TW;q=0.7,zh;q=0.6,su;q=0.5",
				"upgrade-insecure-requests": "1",
				"Referer": "http://music.migu.cn",
			},
			"referrerPolicy": "no-referrer-when-downgrade",
			"body": null,
			"method": "GET",
			"mode": "cors"
		}
	}
	async getCountPages() {
		console.log(this.printEmbellish('开始获取总页数'));
		let date = Date.now(),
			htmlText = await this.fetchHtml(this.baseUrl),
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
		let countPage = await this.getCountPages(),
			date = Date.now();
		console.log(this.printEmbellish('开始获取下载链接'));
		for (let i = 1; i <= countPage; i++) {
			console.log(`开始获取第${chalk.green(i)}页下载链接\n`);
			let arr = await this.getMusicInfo(`${this.baseUrl}${+i > 1 ? '&page=' + i : ''}`);
			this.musicInfo.push(...arr);
			console.log(`获取第${i}页下载链接完毕, 共有${chalk.green(arr.length)}个下载链接\n`);
		}
		this.logs.getMusicInfo.date = Date.now() - date;
		if (this.createFolder()) {
			console.log(this.printEmbellish('开始下载音乐'));
			await this.startDown();
			console.log(this.printEmbellish('下载完成'));
			this.showLog();
		}
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
							const dest = fs.createWriteStream(`./周杰伦/${v.songName}.mp3`);
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
		let res = false,
			path = `./${this.keyword}`;
		try {
			if (!fs.existsSync(path)) {
				fs.mkdirSync(path);
				res = true;
			} else {
				console.log('文件夹已经存在');
			}
		} catch (e) {
			console.log('创建文件夹失败');
		}
		return true;
	}
	printEmbellish(content, qualifier = '-', repeat = 15) {
		return chalk.green(`${qualifier.repeat(repeat)}${content}${qualifier.repeat(repeat)}\n`);
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
	async getDownLink(copyrightId, songName) {
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

		await fetch('http://music.migu.cn/v3/api/order/download', {
				method: 'post',
				body: params,
				"headers": {
					"accept": "*/*",
					"accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh-TW;q=0.7,zh;q=0.6,su;q=0.5",
					"content-type": "application/x-www-form-urlencoded; charset=UTF-8",
					"x-requested-with": "XMLHttpRequest",
					"Referer": "http://music.migu.cn",
					"Cookie": "migu_cookie_id=42616c1b-cd80-4993-89ed-bf6c0cbec2ba-n41569223802911; WT_FPC=id=2a3059d23a73fcf6af01569236896446:lv=1569237294248:ss=1569236896446; player_stop_open=0; addplaylist_has=1; add_play_now=1; audioplayer_exist=1; audioplayer_open=1; audioplayer_new=0; playlist_change=0; playlist_adding=0; migu_music_status=true; migu_music_uid=15687995484370450854210; migu_music_avatar=%252F%252Fcdnmusic.migu.cn%252Fv3%252Fstatic%252Fimg%252Fcommon%252Fheader%252Fdefault-avatar.png; migu_music_nickname=%E5%92%AA%E5%92%95%E7%94%A8%E6%88%B7; migu_music_level=0; migu_music_credit_level=1; migu_music_platinum=0; migu_music_msisdn=17610915918; migu_music_email=; migu_music_sid=s%3A4Ggfx4Z87HCri4JotLBaFyHmsRBnE1pQ.GPfyqbjFJhkUfY2%2BCep04e9z2QIOhugqCegSoJf5iv0"
				},
			})
			.then(res => res.json())
			.then(data => {
				if (data.returnCode === '000000' && data.returnDesc === '恭喜您！验证成功！请在浏览器中完成下载') {
					dlink = data.downUrl;
					console.log(`${chalk.green('获取歌曲'+ chalk.bold(chalk.blue(songName)) +'下载地址成功')}`);
				} else {
					console.log(errorTxt);
				}
			}).
		catch((e) => {
			console.log(`${e} ${errorTxt}`);
		});
		return dlink;
	}
	async fetchHtml(url) {
		return await fetch(url, this.config)
			.then(res => res.text())
			.then(body => body)
	}
}

exports.FetchMiGuMusic = FetchMiGuMusic;