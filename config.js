module.exports = {
	searchUrl: 'http://music.migu.cn/v3/search/?keyword=',
	getHeaders: {
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
	},
	postHeader: {
		method: 'post',
		body: {},
		"headers": {
			"accept": "*/*",
			"accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh-TW;q=0.7,zh;q=0.6,su;q=0.5",
			"content-type": "application/x-www-form-urlencoded; charset=UTF-8",
			"x-requested-with": "XMLHttpRequest",
			"Referer": "http://music.migu.cn",
			"Cookie": "migu_cookie_id=42616c1b-cd80-4993-89ed-bf6c0cbec2ba-n41569223802911; WT_FPC=id=2a3059d23a73fcf6af01569236896446:lv=1569400623093:ss=1569400577704; audioplayer_exist=1; player_stop_open=0; addplaylist_has=1; add_play_now=1; audioplayer_open=1; audioplayer_new=0; playlist_change=0; playlist_adding=0; migu_music_status=true; migu_music_uid=15687995484370450854210; migu_music_avatar=%252F%252Fcdnmusic.migu.cn%252Fv3%252Fstatic%252Fimg%252Fcommon%252Fheader%252Fdefault-avatar.png; migu_music_nickname=%E5%92%AA%E5%92%95%E7%94%A8%E6%88%B7; migu_music_level=0; migu_music_credit_level=1; migu_music_platinum=0; migu_music_msisdn=17610915918; migu_music_email=; migu_music_sid=s%3AqU_ud1dYw4d7BIYn4S6QhUgo6DbwZzsn.WmbgO1hAVObXkuBvXPH6FwB8yzeShfU9D4Q%2FAeiVfNk"
		},
	},
	copyrightId: '6005661J3NA',
	songName: '但愿人长久'
}