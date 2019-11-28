import {
  MUSIC_MAP,
  VIDEO_MAP,
  POSTER_MAP,
  BG_IMAGES,
  QUESTION_DATA
} from './constants.js';
const $ = document.getElementById.bind(document);
const $videoBox = $('videoBox');
const $canvasBox = $('canvasBox');

const TweenMax = window.TweenMax;
const PIXI = window.PIXI;

const size = {
  width: 870,
  height: 1280
};

let soundBg; // 背景音乐对象
let soundBtn; // 按钮音乐对象

// 创建 PIXI 实例
const app = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  forceCanvas: true,
  autoDensity: true,
  resolution: window.devicePixelRatio,
  transparent: true,
  preserveDrawingBuffer: false,
  autoStart: true
});

// 创建容器
const container = new PIXI.Container();
container.scale.set(innerHeight / size.height, innerHeight / size.height);
app.stage.addChild(container);

// 将实例加入 html 文档中
$canvasBox.appendChild(app.view);

// 创建 bgLoader , 主要用来加载页面用到的一些背景图片资源
const bgLoader = new PIXI.Loader();
bgLoader.add(BG_IMAGES).load(() => {
  // 资源加载完成后，马上渲染第一个场景
  controller.render(controller.scenes[0]);
});

// 创建 mainLoader , 用来加载主要内容，背景音乐，按钮音乐等
const mainLoader = new PIXI.Loader();
// 添加问题数据
mainLoader.add(QUESTION_DATA);

// 添加背景音乐
mainLoader.add(MUSIC_MAP.bgm, function(loader, resource) {
  soundBg = loader.sound;
  soundBg.loop = true;
  // soundBg.play();
});

// 添加点击按钮的声音
mainLoader.add(MUSIC_MAP.btn, function(loader, resource) {
  soundBtn = loader.sound;
});

// 视频控制器
const videoController = {
  current: '',
  el: '',
  urlMap: VIDEO_MAP,
  posterMap: POSTER_MAP,
  init: function() {
    $videoBox.innerHTML = [
      '<video',
      'preload="auto"',
      'x5-video-player-type="h5"',
      'x5-video-player-fullscreen="true"',
      'x5-video-orientation="portraint"',
      'x-webkit-airplay="true"',
      'webkit-playsinline="true"',
      'playsinline="true"></video>'
    ].join(' ');

    this.el = document.querySelector('video');

    // 视频播放时，就隐藏掉舞台
    this.el.addEventListener('canplay', function() {
      controller.fadeOut();
    });

    //  视频结束时，再次显示舞台，并切换到下一个场景
    this.el.addEventListener('ended', function() {
      controller.next();
    });
  },
  play: function(e) {
    this.current = e;
    this.el.src = this.urlMap[e];
    this.el.currentTime = 0;
    this.el.play();
  },
  pause: function() {
    this.el.pause();
  },
  replay: function() {
    this.el.currentTime = 0;
    this.el.play();
  },
  destory: function() {
    // r.remove();
  }
};

//  pixi 场景控制器
const controller = {
  displacementSprite: null,
  loadingTip: null,
  current: '', // 当前场景
  isSceneReady: false, // 当前场景是否已经就绪
  // 所有的场景切换函数名称
  scenes: [
    'renderLoading',
    'renderQ1',
    'renderQ2',
    'renderQ3',
    'renderQ4',
    'renderQ5',
    'renderQ6'
  ],
  answers: {}, // 记录答案，格式如 'q1: 2'
  showLoadingTip: function() {
    TweenMax.to(this.loadingTip, 0.5, {
      alpha: 1,
      ease: window.Power2.easeIn
    });
  },
  hide: function() {
    container.alpha = 0;
    controller.clear();
  },
  fadeOut: function(time) {
    TweenMax.to(container, time || 0.5, {
      alpha: 0,
      ease: window.Power2.easeIn,
      onComplete: function() {
        controller.clear();
      }
    });
  },

  // 这个函数有什么用呢？？
  createDisplacementFilter: function(targets) {
    const sprite = new PIXI.Sprite(
      bgLoader.resources.displacement_map_repeat.texture
    );
    sprite.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
    const filter = new PIXI.filters.DisplacementFilter(sprite);
    container.addChild(sprite);
    targets.forEach(function(target) {
      target.filters = [filter];
    });
    filter.scale.x = 10;
    filter.scale.y = 30;
    this.displacementSprite = sprite;
  },

  // 场景渲染函数，接受一个场景类型参数，如果匹配到对应的场景函数，则开始切换场景
  render(scene) {
    const renderFn = this[scene];
    if (!renderFn) {
      return console.warn(`controller.${scene} is not a function`);
    }
    this.current = scene;
    this.isSceneReady = false;

    // 将旧的场景设置透明，明且移除掉的内容
    container.alpha = 0;
    this.clear();

    // 调用渲染函数
    renderFn.call(this);
    container.x = -(container.width / 2 - window.innerWidth / 2);
    TweenMax.to(container, 0.5, {
      alpha: 1,
      ease: window.Power2.easeIn
    });
  },

  // 清空舞台里的内容
  clear: function() {
    this.displacementSprite = null;
    TweenMax.killAll();
    container.removeChildren();
  },

  // 切换到下一个场景
  next: function() {
    const { scenes, current } = this;
    const index = scenes.indexOf(current);
    index < scenes.length - 1 && this.render(scenes[index + 1]);
  },

  // 创建一个具有交互的容器
  createInteractiveContainer(options = {}) {
    const { x = 0, y = 0, alpha = 1 } = options;
    const interactiveContainer = new PIXI.Container();
    interactiveContainer.x = x;
    interactiveContainer.y = y;
    interactiveContainer.alpha = alpha;
    interactiveContainer.interactive = true;
    interactiveContainer.buttonMode = true;
    return interactiveContainer;
  },

  /**
   *
   * 创建 animatedsPrite 实例，并设置一些通用的属性
   * @param { object } options
   * @return { AnimatedSprite } animatedSprite
   */
  createAnimatedSprite(options = {}) {
    const {
      resourcesKey,
      animationsKey,
      x = 0,
      y = 0,
      loop = false,
      alpha = 1,
      animationSpeed = 0.5,
      anchor = 0
    } = options;
    const spritesheet = mainLoader.resources[resourcesKey].spritesheet;
    const animatedSprite = new PIXI.AnimatedSprite(
      spritesheet.animations[animationsKey]
    );
    animatedSprite.x = x;
    animatedSprite.y = y;
    animatedSprite.interactive = true;
    animatedSprite.buttonMode = true;
    animatedSprite.loop = loop;
    animatedSprite.alpha = alpha;
    animatedSprite.animationSpeed = animationSpeed;
    animatedSprite.anchor.set(anchor);
    return animatedSprite;
  },

  // 选择答案的函数
  onSelectAnswer(target, cb) {
    const handler = () => {
      const { videoName, qIndex, aIndex } = target.metaData;
      console.log(this, target.metaData);

      if (!this.isSceneReady || this.answers[qIndex]) {
        return;
      }

      soundBtn.play();
      this.answers[qIndex] = aIndex;
      videoName && videoController.play(videoName);
      cb && cb();
    };

    // 同时要绑定 tap 和 click 事件，tap 用于移动端，click 用于桌面
    target.on('tap', handler).on('click', handler);
  },

  // 渲染 loading 场景
  renderLoading() {
    // 载入 Loading 背景图片
    const spriteBg = new PIXI.Sprite(bgLoader.resources.loading_bg.texture);
    spriteBg.x = 0;
    spriteBg.y = 0;
    container.addChild(spriteBg);

    // 新建一个子容器 childContainer，用来载入 loading 的装饰物，如云之类的。
    const childContainer = new PIXI.Container();
    container.addChild(childContainer);

    // 创建装饰物休 spriteYun1
    const spriteYun1 = new PIXI.Sprite(bgLoader.resources.loading_yun1.texture);
    spriteYun1.x = 0;
    spriteYun1.y = spriteBg.height - spriteYun1.height;
    childContainer.addChild(spriteYun1);

    // 创建装饰物体 spriteYun2
    const spriteYun2 = new PIXI.Sprite(bgLoader.resources.loading_yun2.texture);
    spriteYun2.x = 0;
    spriteYun2.y = 0;
    childContainer.addChild(spriteYun2);

    // 再新建一个子容器 childContainer2
    const childContainer2 = this.createInteractiveContainer();

    // 点击开始，并播放视频
    const start = () => {
      if (mainLoader.loading || this.taped) {
        return;
      }
      videoController.init();
      soundBtn.play();
      this.taped = true;
      TweenMax.to(spriteTxt, 0.5, {
        alpha: 0
      });
      videoController.play('main');
    };

    childContainer2.on('click', start).on('tap', start);

    // 创建精灵
    const spriteYun3 = new PIXI.Sprite(bgLoader.resources.loading_yun3.texture);
    spriteYun3.x = 0;
    spriteYun3.y = 0;
    childContainer2.addChild(spriteYun3);
    childContainer2.x = 0;
    childContainer2.y = size.height / 2 - spriteYun3.height / 2;

    const childContainer3 = new PIXI.Container();
    const spriteDp = new PIXI.Sprite(bgLoader.resources.loading_dp.texture);

    spriteDp.x = 0;
    spriteDp.y = -2;
    childContainer3.addChild(spriteDp);

    const spriteLh = new PIXI.Sprite(bgLoader.resources.loading_lh.texture);
    spriteLh.x = spriteLh.width / 2;
    spriteLh.y = spriteLh.width / 2;
    spriteLh.pivot.x = spriteLh.width / 2;
    spriteLh.pivot.y = spriteLh.height / 2;
    childContainer3.addChild(spriteLh);

    const spritesheetPoint = bgLoader.resources.loading_point.spritesheet;
    const animatedSpritePoint = new PIXI.AnimatedSprite(
      spritesheetPoint.animations.point
    );
    animatedSpritePoint.x = 0;
    animatedSpritePoint.y = 0;
    animatedSpritePoint.animationSpeed = 0.3;

    animatedSpritePoint.play();
    childContainer3.addChild(animatedSpritePoint);

    const spritesheetTz = bgLoader.resources.loading_tz.spritesheet;
    const animatedSpriteTz = new PIXI.AnimatedSprite(
      spritesheetTz.animations.tz
    );
    animatedSpriteTz.x = animatedSpriteTz.width / 2;
    animatedSpriteTz.y = animatedSpriteTz.width / 2;
    animatedSpriteTz.pivot.x = animatedSpriteTz.width / 2;
    animatedSpriteTz.pivot.y = animatedSpriteTz.height / 2;
    animatedSpriteTz.animationSpeed = 0.5;
    animatedSpriteTz.play();
    childContainer3.addChild(animatedSpriteTz);

    const spriteP = new PIXI.Sprite(bgLoader.resources.loading_p.texture);
    spriteP.x = spriteP.width / 2;
    spriteP.y = spriteP.width / 2;
    spriteP.pivot.x = spriteP.width / 2;
    spriteP.pivot.y = spriteP.height / 2;
    childContainer3.addChild(spriteP);

    const graphics = new PIXI.Graphics();
    app.x = 0;
    app.y = 0;
    childContainer3.addChild(graphics);
    spriteP.mask = graphics;

    const spriteWl = new PIXI.Sprite(bgLoader.resources.loading_wl.texture);
    spriteWl.x = spriteWl.width / 2;
    spriteWl.y = spriteWl.width / 2;
    spriteWl.pivot.x = spriteWl.width / 2;
    spriteWl.pivot.y = spriteWl.height / 2;
    childContainer3.addChild(spriteWl);

    childContainer3.x = childContainer2.width / 2 - childContainer3.width / 2;
    childContainer3.y = childContainer2.height / 2 - childContainer3.height / 2;
    childContainer2.addChild(childContainer3);

    // “开启你的人格测试” 提示
    const spriteTxt = new PIXI.Sprite(bgLoader.resources.loading_txt.texture);
    spriteTxt.x = childContainer2.width / 2 - spriteTxt.width / 2;
    spriteTxt.y = 725;
    spriteTxt.alpha = 0;
    childContainer2.addChild(spriteTxt);
    this.loadingTip = spriteTxt;

    // 这个有什么用呀？？？
    this.createDisplacementFilter([childContainer, spriteYun3]);
    container.addChild(childContainer2);

    // 黑色人物顺时间旋转
    TweenMax.to([animatedSpriteTz], 8, {
      rotation: 2 * Math.PI,
      repeat: -1,
      ease: 'linear'
    });

    // 中间的圆圈逆时针旋转
    TweenMax.to([spriteLh, spriteWl, spriteP], 10, {
      rotation: -2 * Math.PI,
      repeat: -1,
      ease: 'linear'
    });

    // 加载资源完成后，显示 tips 信息
    mainLoader.load(() => {
      controller.showLoadingTip();
      this.isSceneReady = true;
    });
  },

  // 渲染问题一场景
  renderQ1: function() {
    // 显示背景
    const spriteBg = new PIXI.Sprite(mainLoader.resources.q1_bg.texture);
    spriteBg.x = 0;
    spriteBg.y = 0;
    container.addChild(spriteBg);

    // 显示问题的题目
    const animatedSpriteTitle = this.createAnimatedSprite({
      resourcesKey: 'q1_title',
      animationsKey: 'q1title',
      x: 388,
      y: 550,
      animationSpeed: 0.3
    });
    animatedSpriteTitle.play();
    animatedSpriteTitle.onComplete = function() {
      this.isSceneReady = true;
      TweenMax.to(childContainer, 0.5, {
        alpha: 1,
        onComplete: function() {
          animatedSpriteA1.play();
          animatedSprteT1.alpha = 1;
          animatedSprteT1.play();
        }
      });
      TweenMax.to(childContainer2, 0.5, {
        alpha: 1,
        onComplete: function() {
          animatedSpriteA2.play();
          animatedSpriteT2.alpha = 1;
          animatedSpriteT2.play();
        }
      });
    }.bind(this);
    container.addChild(animatedSpriteTitle);

    // 渲染答案1
    const childContainer = this.createInteractiveContainer({
      x: 110,
      y: 740,
      alpha: 0
    });
    childContainer.metaData = {
      videoName: 'q11',
      qIndex: 'q1',
      aIndex: 'a11'
    };
    this.onSelectAnswer(childContainer);
    const spritesheetA1 = mainLoader.resources.q1_a1.spritesheet;
    const animatedSpriteA1 = new PIXI.AnimatedSprite(
      spritesheetA1.animations.q1a1
    );
    animatedSpriteA1.position.set(0, 0);
    animatedSpriteA1.loop = !0;
    animatedSpriteA1.animationSpeed = 0.5;
    animatedSpriteA1.anchor.set(0);
    childContainer.addChild(animatedSpriteA1);
    const spritesheetT1 = mainLoader.resources.q1_t1.spritesheet;
    const animatedSprteT1 = new PIXI.AnimatedSprite(
      spritesheetT1.animations.q1t1
    );
    animatedSprteT1.position.set(40, -62); // d.position.set(-10, -62)
    animatedSprteT1.loop = !1;
    animatedSprteT1.alpha = 0;
    animatedSprteT1.animationSpeed = 0.5;
    animatedSprteT1.anchor.set(0);
    childContainer.addChild(animatedSprteT1);
    container.addChild(childContainer);

    // 渲染答案2
    const childContainer2 = this.createInteractiveContainer({
      x: 534,
      y: 600,
      alpha: 0
    });
    childContainer2.metaData = {
      videoName: 'q12',
      qIndex: 'q1',
      aIndex: 'a12'
    };
    this.onSelectAnswer(childContainer2);
    const spritesheetA2 = mainLoader.resources.q1_a2.spritesheet;
    const animatedSpriteA2 = new PIXI.AnimatedSprite(
      spritesheetA2.animations.q1a2
    );
    animatedSpriteA2.loop = !0;
    animatedSpriteA2.animationSpeed = 0.5;
    animatedSpriteA2.anchor.set(0);
    childContainer2.addChild(animatedSpriteA2);

    const spritesheetT2 = mainLoader.resources.q1_t2.spritesheet;
    const animatedSpriteT2 = new PIXI.AnimatedSprite(
      spritesheetT2.animations.q1t2
    );
    animatedSpriteT2.position.set(140, 95);
    // m.android && l ? q.position.set(140, 95) : q.position.set(160, 95)

    animatedSpriteT2.loop = false;
    animatedSpriteT2.alpha = 0;
    animatedSpriteT2.animationSpeed = 0.5;
    animatedSpriteT2.anchor.set(0);
    childContainer2.addChild(animatedSpriteT2);
    container.addChild(childContainer2);
    this.createDisplacementFilter([spriteBg]);
  },

  // 渲染问题二场景
  renderQ2: function() {
    /**
     * @param {object} target
     * @param { fn } cb
     * e => moveFn
     */
    // const moveFn = (target, cb) => {
    //   TweenMax.to(target, 0.5, {
    //     alpha: 0,
    //     x: spriteL.x + spriteL.width / 2 - target.width / 2,
    //     y: spriteL.y + spriteL.height / 2 - target.height / 2,
    //     onComplete: cb
    //   });
    // };

    // const selectAnswer = () => {
    //   soundBtn.play();
    //   moveFn(this, function() {
    //     // Question.setResult(1, 0);
    //     videoController.play('q2');
    //   });
    // };

    // 渲染背景
    const spriteBg = new PIXI.Sprite(mainLoader.resources.q2_bg.texture);
    spriteBg.x = 0;
    spriteBg.y = 0;
    container.addChild(spriteBg);

    const spriteL = new PIXI.Sprite(mainLoader.resources.q2_l.texture);
    spriteL.x = 312;
    spriteL.y = 520;
    container.addChild(spriteL);

    // 渲染问题题目
    const animatedSpriteTitle = this.createAnimatedSprite({
      resourcesKey: 'q2_title',
      animationsKey: 'q2title',
      x: 611,
      y: 749,
      animationSpeed: 0.3
    });
    animatedSpriteTitle.play();
    animatedSpriteTitle.onComplete = function() {
      this.isSceneReady = true;
      animatedSpriteA1.alpha = 1;
      animatedSpriteA1.play();
      animatedSpriteA2.alpha = 1;
      animatedSpriteA2.play();
      animatedSpriteA3.alpha = 1;
      animatedSpriteA3.play();
      animatedSpriteA4.alpha = 1;
      animatedSpriteA4.play();
    }.bind(this);
    container.addChild(animatedSpriteTitle);

    // 渲染答案1
    const animatedSpriteA1 = this.createAnimatedSprite({
      resourcesKey: 'q2_a1',
      animationsKey: 'q2a1',
      x: 166,
      y: 445
    });
    animatedSpriteA1.metaData = {
      videoName: 'q2',
      qIndex: 'q2',
      aIndex: 'a21'
    };
    this.onSelectAnswer(animatedSpriteA1);
    container.addChild(animatedSpriteA1);

    // 渲染答案2
    const animatedSpriteA2 = this.createAnimatedSprite({
      resourcesKey: 'q2_a2',
      animationsKey: 'q2a2',
      x: 464,
      y: 348
    });
    animatedSpriteA2.metaData = {
      videoName: 'q2',
      qIndex: 'q2',
      aIndex: 'a22'
    };
    this.onSelectAnswer(animatedSpriteA2);
    container.addChild(animatedSpriteA2);

    // 渲染答案3
    const animatedSpriteA3 = this.createAnimatedSprite({
      resourcesKey: 'q2_a3',
      animationsKey: 'q2a3',
      x: 173,
      y: 740
    });
    animatedSpriteA3.metaData = {
      videoName: 'q2',
      qIndex: 'q2',
      aIndex: 'a23'
    };
    this.onSelectAnswer(animatedSpriteA3);
    container.addChild(animatedSpriteA3);

    // 渲染答案4
    const animatedSpriteA4 = this.createAnimatedSprite({
      resourcesKey: 'q2_a4',
      animationsKey: 'q2a4',
      x: 615,
      y: 611
    });
    animatedSpriteA4.metaData = {
      videoName: 'q2',
      qIndex: 'q2',
      aIndex: 'a24'
    };
    this.onSelectAnswer(animatedSpriteA4);
    container.addChild(animatedSpriteA4);

    this.createDisplacementFilter([spriteBg]);
  },

  // 渲染问题三场景
  renderQ3: function() {
    // 渲染背景
    const spriteBg = new PIXI.Sprite(mainLoader.resources.q3_bg.texture);
    spriteBg.x = 0;
    spriteBg.y = 0;
    container.addChild(spriteBg);

    // 渲染装饰物云
    const spriteYun = new PIXI.Sprite(mainLoader.resources.q3_yun.texture);
    spriteYun.x = 0;
    spriteYun.y = 85;
    container.addChild(spriteYun);
    const spriteYun2 = new PIXI.Sprite(mainLoader.resources.q3_yun2.texture);
    spriteYun2.x = 96;
    spriteYun2.y = 283;
    container.addChild(spriteYun2);

    // 渲染题目
    const animatedSpriteTitle = this.createAnimatedSprite({
      resourcesKey: 'q3_title',
      animationsKey: 'q3title',
      x: 176,
      y: 600
    });
    animatedSpriteTitle.play();
    animatedSpriteTitle.onComplete = function() {
      this.isSceneReady = true;
      animatedSpriteA1.alpha = 1;
      animatedSpriteA1.play();
      animatedSpriteA2.alpha = 1;
      animatedSpriteA2.play();
      animatedSpriteA3.alpha = 1;
      animatedSpriteA3.play();
    }.bind(this);
    container.addChild(animatedSpriteTitle);

    // 渲染答案1
    const animatedSpriteA1 = this.createAnimatedSprite({
      resourcesKey: 'q3_a1',
      animationsKey: 'q3a1',
      x: 200,
      y: 400,
      alpha: 0
    });
    animatedSpriteA1.metaData = {
      videoName: 'q31',
      qIndex: 'q3',
      aIndex: 'a31'
    };
    this.onSelectAnswer(animatedSpriteA1);
    container.addChild(animatedSpriteA1);

    // 渲染答案2
    const animatedSpriteA2 = this.createAnimatedSprite({
      resourcesKey: 'q3_a2',
      animationsKey: 'q3a2',
      x: 378,
      y: 450,
      alpha: 0
    });
    animatedSpriteA2.metaData = {
      videoName: 'q31',
      qIndex: 'q3',
      aIndex: 'a32'
    };
    this.onSelectAnswer(animatedSpriteA2);
    container.addChild(animatedSpriteA2);

    // 渲染答案3
    const animatedSpriteA3 = this.createAnimatedSprite({
      resourcesKey: 'q3_a3',
      animationsKey: 'q3a3',
      x: 505,
      y: 344,
      alpha: 0
    });
    animatedSpriteA3.metaData = {
      videoName: 'q31',
      qIndex: 'q3',
      aIndex: 'a33'
    };
    this.onSelectAnswer(animatedSpriteA3);
    container.addChild(animatedSpriteA3);

    this.createDisplacementFilter([spriteYun, spriteYun2]);
  },

  // 渲染问题四场景
  renderQ4: function() {
    // 渲染背景
    const spriteBg = new PIXI.Sprite(mainLoader.resources.q4_bg.texture);
    spriteBg.x = 0;
    spriteBg.y = 0;
    container.addChild(spriteBg);

    // 渲染题目
    const animatedSpriteTitle = this.createAnimatedSprite({
      resourcesKey: 'q4_title',
      animationsKey: 'q4title',
      x: 600,
      y: 150,
      animationSpeed: 0.3
    });

    animatedSpriteTitle.play();
    animatedSpriteTitle.onComplete = function() {
      this.isSceneReady = true;
      TweenMax.to(spriteA1, 0.5, {
        alpha: 1
      }),
        TweenMax.to(spriteA2, 0.5, {
          alpha: 1
        });
    }.bind(this);
    container.addChild(animatedSpriteTitle);

    // 渲染答案1
    const spriteA1 = new PIXI.Sprite(mainLoader.resources.q4_a1.texture);
    spriteA1.x = 138;
    spriteA1.y = 526;
    spriteA1.interactive = !0;
    spriteA1.buttonMode = !0;
    spriteA1.alpha = 0;
    spriteA1.metaData = {
      videoName: 'q41',
      qIndex: 'q4',
      aIndex: 'a41'
    };
    this.onSelectAnswer(spriteA1);
    container.addChild(spriteA1);

    // 渲染答案2
    const spriteA2 = new PIXI.Sprite(mainLoader.resources.q4_a2.texture);
    spriteA2.x = 380;
    spriteA2.y = 532;
    spriteA2.interactive = !0;
    spriteA2.buttonMode = !0;
    spriteA2.alpha = 0;
    spriteA2.metaData = {
      videoName: 'q42',
      qIndex: 'q4',
      aIndex: 'a42'
    };
    this.onSelectAnswer(spriteA2);
    container.addChild(spriteA2);

    this.createDisplacementFilter([spriteBg]);
  },

  // 渲染问题五场景
  renderQ5: function() {
    // 渲染背景
    const spriteBg = new PIXI.Sprite(mainLoader.resources.q5_bg.texture);
    spriteBg.x = 0;
    spriteBg.y = 0;
    container.addChild(spriteBg);

    // 渲染题目
    const animatedSpriteTitle = this.createAnimatedSprite({
      resourcesKey: 'q5_title',
      animationsKey: 'q5title',
      x: 629,
      y: 531,
      animationSpeed: 0.3
    });
    animatedSpriteTitle.play();
    animatedSpriteTitle.onComplete = function() {
      this.isSceneReady = true;
      animatedSpriteA1.alpha = 1;
      animatedSpriteA1.play();
      animatedSpriteA2.alpha = 1;
      animatedSpriteA2.play();
      animatedSpriteA3.alpha = 1;
      animatedSpriteA3.play();
      animatedSpriteA4.alpha = 1;
      animatedSpriteA4.play();
    }.bind(this);
    container.addChild(animatedSpriteTitle);

    // 渲染答案1
    const animatedSpriteA1 = this.createAnimatedSprite({
      resourcesKey: 'q5_a1',
      animationsKey: 'q5a1',
      x: 244,
      y: 185,
      alpha: 0
    });
    animatedSpriteA1.metaData = {
      videoName: 'q5',
      qIndex: 'q5',
      aIndex: 'a51'
    };
    this.onSelectAnswer(animatedSpriteA1);
    container.addChild(animatedSpriteA1);

    // 渲染答案2
    const animatedSpriteA2 = this.createAnimatedSprite({
      resourcesKey: 'q5_a2',
      animationsKey: 'q5a2',
      x: 453,
      y: 171,
      alpha: 0
    });
    animatedSpriteA2.metaData = {
      videoName: 'q5',
      qIndex: 'q5',
      aIndex: 'a52'
    };
    this.onSelectAnswer(animatedSpriteA2);
    container.addChild(animatedSpriteA2);

    // 渲染答案3
    const animatedSpriteA3 = this.createAnimatedSprite({
      resourcesKey: 'q5_a3',
      animationsKey: 'q5a3',
      x: 206,
      y: 416,
      alpha: 0
    });
    animatedSpriteA3.metaData = {
      videoName: 'q5',
      qIndex: 'q5',
      aIndex: 'a53'
    };
    this.onSelectAnswer(animatedSpriteA3);
    container.addChild(animatedSpriteA3);

    // 渲染答案4
    const animatedSpriteA4 = this.createAnimatedSprite({
      resourcesKey: 'q5_a4',
      animationsKey: 'q5a4',
      x: 420,
      y: 457,
      alpha: 0
    });
    animatedSpriteA4.metaData = {
      videoName: 'q5',
      qIndex: 'q5',
      aIndex: 'a54'
    };
    this.onSelectAnswer(animatedSpriteA4);
    container.addChild(animatedSpriteA4);

    this.createDisplacementFilter([spriteBg]);
  },

  // 渲染问题六场景
  renderQ6: function() {
    // 渲染背景
    const spriteBg = new PIXI.Sprite(mainLoader.resources.q6_bg.texture);
    spriteBg.x = 0;
    spriteBg.y = 0;
    container.addChild(spriteBg);

    // 渲染答案1
    const childContainer = this.createInteractiveContainer({
      x: 18,
      y: 243
    });
    const spriteA1 = new PIXI.Sprite(mainLoader.resources.q6_a1.texture);
    spriteA1.position.set(0, 0);
    childContainer.addChild(spriteA1);
    const animatedSpriteT1 = this.createAnimatedSprite({
      resourcesKey: 'q6_t1',
      animationsKey: 'q6t1',
      alpha: 0
    });
    animatedSpriteT1.metaData = {
      qIndex: 'q6',
      aIndex: 'a61'
    };
    this.onSelectAnswer(animatedSpriteT1);
    animatedSpriteT1.position.set(200, 290);
    childContainer.addChild(animatedSpriteT1);
    container.addChild(childContainer);

    // 渲染答案2
    const childContainer2 = this.createInteractiveContainer({
      x: 405,
      y: 278
    });
    const spriteA2 = new PIXI.Sprite(mainLoader.resources.q6_a2.texture);
    spriteA2.position.set(0, 0);
    childContainer2.addChild(spriteA2);
    const animatedSpriteT2 = this.createAnimatedSprite({
      resourcesKey: 'q6_t2',
      animationsKey: 'q6t2',
      alpha: 0
    });
    animatedSpriteT2.metaData = {
      qIndex: 'q6',
      aIndex: 'a62'
    };
    this.onSelectAnswer(animatedSpriteT2);
    animatedSpriteT2.position.set(220, 290);
    childContainer2.addChild(animatedSpriteT2);
    container.addChild(childContainer2);

    // 渲染题目
    const animatedSpriteTitle = this.createAnimatedSprite({
      resourcesKey: 'q6_title',
      animationsKey: 'q6title',
      x: 378,
      y: 522,
      animationSpeed: 0.3
    });
    animatedSpriteTitle.play();
    animatedSpriteTitle.onComplete = function() {
      this.isSceneReady = true;
      animatedSpriteT1.alpha = 1;
      animatedSpriteT1.play();
      animatedSpriteT2.alpha = 1;
      animatedSpriteT2.play();
    }.bind(this);
    container.addChild(animatedSpriteTitle);

    this.createDisplacementFilter([spriteBg]);
  }

  //    n.on("resize",
  // function() {
  //     c = window.innerWidth / h.width,
  //     g = window.innerHeight / h.height,
  //     app.renderer.resize(window.innerWidth, window.innerHeight),
  //     x.scale.set(g, g),
  //     x.x = -(x.width / 2 - window.innerWidth / 2)
  // }),
  // app.ticker.add(function() {
  //     w.displacementSprite && (w.displacementSprite.y++, w.displacementSprite.y > w.displacementSprite.height && (w.displacementSprite.y = 0))
  // }),
};
