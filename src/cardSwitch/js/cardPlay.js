class CardPlay {
    constructor(el, options) {
        this.options = {
            acceptClass: 'stack__item--accept',
            rejectClass: 'stack__item--reject',
            perspective: 1000,
            perspectiveOrigin: '-50% 50%',
            visible: 3,
            infinite: true,
            onEndStack: function () {
                return false;
            },
            stackItemsAnimationDelay: 0,
        }
        this.el = el;
        this.options = $.extend(this.options, options);
        this.items = [].slice.call(this.el.children);
        this.itemsTotal = this.items.length;
        if (this.options.infinite && this.options.visible >= this.itemsTotal || !this.options.infinite && this.options.visible > this.itemsTotal || this.options.visible <= 0) {
            this.options.visible = 1;
        }
        this.current = 0;
        this.init();
        this.bindDomEvent();
    }

    accept(callback) {
        this.next('accept', callback);
    }

    reject(callback) {
        this.next('reject', callback);
    }

    restart() {
        this.hasEnded = false;
        this.init();
    }

    init() {
        $(this.el).css({
            perspective: this.options.perspective + 'px',
            WebkitPerspective: this.options.perspective + 'px',
            perspectiveOrigin: this.options.perspectiveOrigin,
            WebkitPerspectiveOrigin: this.options.perspectiveOrigin,
        })

        // the items
        for (var i = 0; i < this.itemsTotal; ++i) {
            var item = this.items[i];
            if (i < this.options.visible) {
                $(item).css({
                    opacity: 1,
                    pointerEvents: 'auto',
                    zIndex: i === 0 ? parseInt(this.options.visible + 1) : parseInt(this.options.visible - i),
                    transform: 'translate3d(0px, 0px, ' + parseInt(-1 * 50 * i) + 'px)',
                    WebkitTransform: 'translate3d(0px, 0px, ' + parseInt(-1 * 50 * i) + 'px)'
                })
            } else {
                $(item).css({
                    transform: 'translate3d(0 , 0, -' + parseInt(this.options.visible * 50) + 'px)',
                    WebkitTransform: 'translate3d(0,0,-' + parseInt(this.options.visible * 50) + 'px)'
                })
            }
        }
        $(this.items[this.current]).addClass('stack__item--current')
    }

    bindDomEvent() {
        var self = this;
        var startX, startY, moveEndX, moveEndY;
        $(this.el).on('touchstart', function (e) {
            e.preventDefault();
            startX = e.touches[0].pageX;
            startY = e.touches[0].pageY;
        })

        $(this.el).on('touchmove', function (e) {
            e.preventDefault();
            moveEndX = e.touches[0].pageX;
            moveEndY = e.touches[0].pageY;
            var disX = moveEndX - startX;
            var disY = moveEndY - startY;
            if(disX > 0 && Math.abs(disX) > Math.abs(disY)) {
                self.accept();
            } else if (disX < 0 && Math.abs(disX) > Math.abs(disY)) {
                self.reject();
            }
        })
    }

    next(action, callback) {
        if (this.isAnimating || (!this.options.infinite && this.hasEnded)) return;
        this.isAnimating = true;

        // current item
        var currentItem = this.items[this.current];
        $(currentItem).removeClass('stack__item--current')

        // add animation class
        if (action == 'accept') {
            $(currentItem).addClass(this.options.acceptClass);
        } else {
            $(currentItem).addClass(this.options.rejectClass);
        }

        var self = this;
        this.onEndAnimation(currentItem, function () {
            // reset current item
            $(currentItem).css({
                opacity: 0,
                pointerEvents: 'none',
                zIndex: -1,
                transform: 'translate3d(0px, 0px, -' + parseInt(self.options.visible * 50) + 'px)',
                WebkitTransform: 'translate3d(0px, 0px, -' + parseInt(self.options.visible * 50) + 'px)'
            })

            if (action == 'accept') {
                $(currentItem).removeClass(self.options.acceptClass);
            } else {
                $(currentItem).removeClass(self.options.rejectClass);
            }

            self.items[self.current].style.zIndex = self.options.visible + 1;
            self.isAnimating = false;

            if (callback) callback();

            if (!self.options.infinite && self.current === 0) {
                self.hasEnded = true;
                // callback
                self.options.onEndStack(self);
            }
        });

        // set style for the other items
        for (var i = 0; i < this.itemsTotal; ++i) {
            if (i >= this.options.visible) break;

            if (!this.options.infinite) {
                if (this.current + i >= this.itemsTotal - 1) break;
                var pos = this.current + i + 1;
            } else {
                var pos = this.current + i < this.itemsTotal - 1 ? this.current + i + 1 : i - (this.itemsTotal - this.current - 1);
            }

            var item = this.items[pos],
                // stack items animation
                animateStackItems = function (item, i) {
                    $(item).css({
                        pointerEvents: 'auto',
                        opacity: 1,
                        zIndex: parseInt(self.options.visible - i)
                    })
                    
                    $(item).animate({
                        translateZ: parseInt(-1 * 50 * i) + 'px'
                    }, {
                        duration: 500,
                        easing: 'swing'
                    })
                };

            setTimeout(function (item, i) {
                return function () {
                    var preAnimation;

                    if (self.options.stackItemsPreAnimation) {
                        preAnimation = action === 'accept' ? self.options.stackItemsPreAnimation.accept : self.options.stackItemsPreAnimation.reject;
                    }

                    if (preAnimation) {
                        // items "pre animation" properties
                        var animProps = {};

                        for (var key in preAnimation.animationProperties) {
                            var interval = preAnimation.elastic ? preAnimation.animationProperties[key] / self.options.visible : 0;
                            animProps[key] = preAnimation.animationProperties[key] - Number(i * interval);
                        }

                        // this one remains the same..
                        animProps.translateZ = parseInt(-1 * 50 * (i + 1)) + 'px';

                        preAnimation.animationSettings.complete = function () {
                            animateStackItems(item, i);
                        };

                        dynamics.animate(item, animProps, preAnimation.animationSettings);

                    } else {
                        animateStackItems(item, i);
                    }
                };
            }(item, i), this.options.stackItemsAnimationDelay);
        }

        // update current
        this.current = this.current < this.itemsTotal - 1 ? this.current + 1 : 0;
        $(this.items[this.current]).addClass('stack__item--current');
    }

    whichAnimationEvent() {
        var t;
        var el = document.createElement("fakeelement");
        var animations = {
            "animation": "animationend",
            "OAnimation": "oAnimationEnd",
            "MozAnimation": "animationend",
            "WebkitAnimation": "webkitAnimationEnd"
        }
        for (t in animations) {
            if (el.style[t] !== undefined) {
                return animations[t];
            }
        }
    }

    onEndAnimation(el, callback) {
        var animationEnd = this.whichAnimationEvent();
        var onEndCallbackFn = function () {
            this.removeEventListener(animationEnd, onEndCallbackFn);
            if (callback && typeof callback === 'function') {
                callback.call();
            }
        }
        el.addEventListener(animationEnd, onEndCallbackFn);
    }
}