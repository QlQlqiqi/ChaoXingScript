// ==UserScript==
// @name         超星自动跳转视频 + 查题
// @namespace    http://tampermonkey.net/
// @version      1.2.1
// @description  功能简陋的刷时长脚本 + 查题
// @author       QlQl
// @match        *://*.chaoxing.com/*
// @run-at       document-end
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @connect      *
// @icon         https://www.google.com/s2/favicons?sz=64&domain=chaoxing.com
// @original-script https://greasyfork.org/scripts/435457
// @original-author QlQl
// @original-license MIT
// ==/UserScript==


// description:
// - 点击自己想看的那个课程章节，然后刷新，之后不能再手动点击别的章节，以保证脚本的正常运行
// - 如果视频长时间不能播放，则跳到下一个视频，最后一个将会跳到第一个（刷时长）
// - 建议配合 https://greasyfork.org/en/scripts/419816 使用（刷章节测试和完成度）


(async function() {
  'use strict';
  let settings = {
    // 视频加载的时间，单位 ms
    videoLoadTime: 3000,
    // 如果视频长时间不播放，则自动跳转到下一个视频，单位 ms
    videoTroublemWaitTime: 3000,
    // 跳过的名称
    jumpTitles: ['阅读', '第一次直播', '第二次直播', '调查问卷'],
    // 是否在控制台显示进度
    showProgress: false,
    // 脚本加载前等待时间（留给 iframe 的加载时间），单位 ms
    waitTime: 1000,
    // 自动答题的每道题目之间的间隔，单位 ms
    getAnswerTime: 1000,
    // 填写答案的时间
    fillAnswerTime: 55000
  };

  
  // @param {document} iframeDocument 包裹 video 的直接 iframe.document
  // @return {Promise} 
  // 开始播放视频
  function startWatchVideo(iframeDocument) {
    
    let troublemFlag = false;
    
    // 开始播放
    $(iframeDocument).find('.vjs-big-play-button')[0].click();
    
    // 监听视频进度
    return new Promise((resolve, reject) => {
      
      // 如果视频处于暂停状态，点击开始
      let stopButton = $(iframeDocument).find('.vjs-play-control')[0];
      let timeId1 = setInterval(() => {
        if(stopButton.title === '播放')
          stopButton.click()
      }, 1000);
      
      let timeId2 = setInterval(() => {
        if(troublemFlag) {
          clearInterval(timeId1);
          clearInterval(timeId2);
          resolve('troublem');
        }
        troublemFlag = true;
      }, settings.videoTroublemWaitTime);
      
      let lastCurrentTime = 0;
      // video dom
      $(iframeDocument).find('#video_html5_api')[0]
      .addEventListener('timeupdate', function() {
        if(settings.showProgress)
          console.log((this.currentTime / this.duration * 100 + '').slice(0, 5) + '%');
        if(lastCurrentTime != this.currentTime)
          troublemFlag = false;
        lastCurrentTime = this.currentTime;
        if(Math.abs(this.currentTime - this.duration) <= 0.1) {
          clearInterval(timeId1);
          clearInterval(timeId2);
          resolve('ok');
        }
      })
    });
  }
  
  
  // @param {document} iframeDocument 包裹题目的直接 iframe.document
  // @return {Promise | void}
  // 开始自动答题
  async function startAnswer(iframeDocument) {
    // 已完成则返回
    // if($(iframeDocument).find('.ZyTop span')[0].innerHTML === '已完成')
    //   return;
    
    return new Promise(async (resolve) => {
      let TiMus = $(iframeDocument).find('.TiMu');
      // let selects = $(iframeDocument).find('.Zy_ulTop');
      for(let i = 0; i < TiMus.length; i++) {
        let title = TiMus.eq(i).find('.clearfix div')[0].innerText.split('】')[1].slice(0, -3);
        let res = JSON.parse(await getAnswer(title));
        TiMus.eq(i).find('.Zy_TItle').eq(0).append('<span style="font-size: 20px; color: red;">' + res.answer.split('\x01') + '</span>');
        
        // let select = selects.eq(i).find()
        // res.answer.split('\\x01').forEach(item => {
          
        // })
        
        // console.log(i, res.success, res.answer.split('\x01'));
        await new Promise(resolve => {
          setTimeout(() => {
            resolve();
          }, settings.getAnswerTime);
        })
      }
      setTimeout(() => {
        resolve();
      }, settings.fillAnswerTime);
      console.log('over')
      console.log(settings.fillAnswerTime + 'ms 后进入下一节')
    })
  }
  
  // @param {String} question 题目
  // @return {Promise}
  function getAnswer(question) {
    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: 'http://onlinecoursekiller.online/OnlineCourseKiller/killer',
        headers: {
          'Content-type': 'application/x-www-form-urlencoded'
        },
        data: 'q=' + encodeURIComponent(question),
        onload: function(res) {
          resolve(res.responseText);
        }
      })
    })
  }
  
  
  
  // 有两层 iframe 嵌套，tasks 在顶层 document 下，即 top，video 在第二层 iframe 中，即 _self
  let _self = unsafeWindow;
  let top = window.top;
  
  // 等所有的 iframe 加载完
  let deepLevel = 0;
  while(_self !== top) {
    _self = _self.parent;
    deepLevel++;
    if(deepLevel > 3)
      return;
  }
  
  if(deepLevel !== 2) {
    return;
  }

  // iframe 加载预留时间
  await new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, settings.waitTime);
  })
  
  _self = top.frames[0].frames[0];
  
  let $ = top.jQuery; 
  
  // 所有的视频
  let tasks = $('.posCatalog_name');
  
  // 从第 fromIndex 开始
  let fromIndex = 0;
  let chapterId = +top.location.href.split('?')[1].split('&')[0].replace('chapterId=', '');
  for(let i = 0; i < tasks.length; i++) {
    if(+tasks[i].getAttribute("onclick").split('\'')[5] === chapterId) {
      fromIndex = i;
      break;
    }
  }

  // 循环看每个视频
  while(fromIndex < tasks.length) {
    await new Promise(async (resolve) => {
      // 跳转后 settigns.videoLoadTime 开始
      setTimeout(async () => {
        let title = $('.prev_title')[0].title;
        
        // 跳过 settings.jumpTitles
        if(settings.jumpTitles.includes(title)) {
          resolve('jump');
          return;
        }
        
        // 刷题
        if(title === '章节测验') {
          await startAnswer(_self.frames[0].document);
        }
        // 开始看课
        else 
          await startWatchVideo(_self.document)
        resolve();
      }, settings.videoLoadTime);
    })
    
    fromIndex = (fromIndex + 1) % tasks.length;
    tasks.get(fromIndex).click();
  }
  
  
  
})();