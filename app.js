"use strict";

var node = {
    cheerio: require('cheerio'),
    fs: require('fs'),
    mkdirp: require('mkdirp'),
    path: require('path'),
    request: require('request'),
    url: require('url'),
    trim: require('locutus/php/strings/trim')
};

var colors = require('colors');
colors.setTheme({
    red: 'red',
    green: 'green',
    blue: 'blue',
    yellow: 'yellow'
});

var options = {
    uri: 'http://bcy.net/coser/allwork?&p=',
    saveTo: './images',
    startPage: 2308,
    endPage: 2308,
    downLimit: 5,
    totalPage: 0
}

var init = async () => {
    if (!options.totalPage) options.totalPage = options.endPage;
    if (options.totalPage && !options.endPage) options.endPage = options.startPage + options.totalPage - 1;
    for (let i = options.startPage; i <= options.endPage; i++) {
        console.log('======================'.yellow);
        let uri = options.uri + i;
        console.log('开始下载页面：%s'.blue, uri);
        let page = await getPage(uri, i);
        let list = await parseList(page);
        for (let item of list.loc) {
            console.log('------------------'.yellow);
            let itemPage = await getPage(item, list.page);
            let imagesList = await parsePage(itemPage);
            let imageItem = await makeDir(imagesList, item.work, item.character, item.cn);
            for (let img of imageItem.loc) {
                await downImage(img, imageItem.dir, imageItem.page);
            }
        }
    }
    console.log('抓取完成!'.green);
}

var getPage = (item, curPage) => {
    var uri = item.href || item;
    return new Promise((resolve, reject) => {
        node.request(encodeURI(uri), (err, res, body) => {
            if (err) {
                reject(err, page);
            } else {
                console.log('下载页面成功：%s'.green, uri);
                var page = {
                    curPage: curPage,
                    uri: uri,
                    html: body
                };
                resolve(page);
            }
        });
    })
}

var parseList = (page) => {
    console.log('开始分析页面数据：%s'.blue, page.uri);
    var $ = node.cheerio.load(page.html);
    var $posts = $('.span1');
    var src = [];
    $posts.each(function() {
        var href = $(this).find('.work-thumbnail__bd').find("a").attr('href');
        var work = $(this).find('.work-thumbnail__originality').text().replace('/', '-');
        var character = $(this).find('.work-work-thumbnail__role').text().replace('/', '-');
        var cn = $(this).find('.name').text().replace('/', '-');
        if (href) href = 'http://bcy.net' + href;
        src.push({
            href: href,
            work: work,
            character: character,
            cn: cn
        })
    });
    var post = {
        page: page.curPage,
        loc: src,
        title: "page" + page.curPage
    };
    return post;
}

var parsePage = (page) => {
    console.log('开始分析页面数据：%s'.blue, page.uri);
    var $ = node.cheerio.load(page.html);
    var $imgs = $('.detail_std');
    var src = [];
    $imgs.each(function() {
        var href = $(this).attr('src');
        href = href.replace('/w650', '');
        src.push(href)
    });
    var post = {
        page: page.curPage,
        loc: src
    };
    return post;
}

var makeDir = (post, work, character, cn) => {
    var path = node.path;
    post.dir = path.join(options.saveTo, cn + '_' + work + '_' + character);
    console.log('准备创建目录：%s'.blue, post.dir);
    return new Promise((resolve, reject) => {
        if (post.loc.length <= 0) {
            console.log('当前没有图片, 放弃创建目录：%s'.red, post.dir);
            resolve(post);
        } else {
            if (node.fs.existsSync(post.dir)) {
                console.log('目录：%s 已经存在'.red, post.dir);
                resolve(post);
            } else {
                node.mkdirp(post.dir, function(err) {
                    console.log('目录：%s 创建成功'.green, post.dir);
                    resolve(post);
                });
            }
        }
    });
}

var downImage = (imgsrc, dir, page) => {
    var url = node.url.parse(imgsrc);
    var fileName = node.path.basename(url.pathname);
    var toPath = node.path.join(dir, fileName);
    console.log('开始下载图片：%s，保存到：%s，页数：%s / %s'.blue, fileName, dir, page, options.totalPage);
    return new Promise((resolve, reject) => {
        node.request(encodeURI(imgsrc)).pipe(node.fs.createWriteStream(toPath)).on('close', () => {
            console.log('图片下载成功：%s'.green, imgsrc);
            resolve();
        }).on('error', (err) => {
            console.log('图片下载失败：%s'.green, imgsrc);
            reject(err);
        });
    });
}

init();
