import { Animated, Easing, Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ==================== ANIMATION CONSTANTS ====================

/**
 * Enterprise animation timing system with Ethiopian-inspired rhythms
 */
export const ANIMATION_DURATION = {
  // Instant feedback (haptic-like)
  INSTANT: 80,
  MICRO: 120,
  
  // Fast interactions (button presses, toggles)
  FAST: 200,
  QUICK: 250,
  
  // Standard transitions (navigation, modal)
  NORMAL: 320,
  SMOOTH: 400,
  
  // Deliberate animations (page loads, significant changes)
  SLOW: 550,
  DELIBERATE: 700,
  
  // Extended sequences (onboarding, celebrations)
  EXTENDED: 1000,
  CELEBRATORY: 1500,
};

/**
 * Ethiopian-inspired easing curves
 * Based on traditional Ethiopian music and dance rhythms
 */
export const ANIMATION_EASING = {
  // Standard curves
  LINEAR: Easing.linear,
  EASE: Easing.ease,
  EASE_IN: Easing.in(Easing.ease),
  EASE_OUT: Easing.out(Easing.ease),
  EASE_IN_OUT: Easing.inOut(Easing.ease),
  
  // Ethiopian rhythmic patterns
  ETHIOPIAN_BOUNCE: Easing.inOut(Easing.poly(1.8)),
  MESKEL_FLOW: Easing.out(Easing.sin),
  COFFEE_RHYTHM: Easing.inOut(Easing.circle),
  NILE_CURRENT: Easing.out(Easing.exp),
  HIGHLAND_STEP: Easing.inOut(Easing.quad),
  
  // Enhanced curves
  BOUNCE: Easing.bounce,
  ELASTIC: Easing.elastic(1.2),
  BACK: Easing.back(1.5),
  SHARP_IN: Easing.in(Easing.cubic),
  SHARP_OUT: Easing.out(Easing.cubic),
};

/**
 * Animation configuration for different platforms
 */
export const PLATFORM_CONFIG = {
  ANDROID: {
    USE_NATIVE_DRIVER: true,
    DEFAULT_EASING: ANIMATION_EASING.SHARP_OUT,
    DURATION_MULTIPLIER: 1.1,
  },
  IOS: {
    USE_NATIVE_DRIVER: true,
    DEFAULT_EASING: ANIMATION_EASING.EASE_OUT,
    DURATION_MULTIPLIER: 1.0,
  },
  WEB: {
    USE_NATIVE_DRIVER: false,
    DEFAULT_EASING: ANIMATION_EASING.EASE_IN_OUT,
    DURATION_MULTIPLIER: 0.9,
  },
};

// ==================== ETHIOPIAN-INSPIRED ANIMATIONS ====================

/**
 * Signature Ethiopian animations reflecting cultural heritage
 */
export const ETHIOPIAN_ANIMATIONS = {
  // Meskel Flower Bloom - Celebration animation
  MESKEL_FLOWER: {
    duration: ANIMATION_DURATION.DELIBERATE,
    easing: ANIMATION_EASING.ETHIOPIAN_BOUNCE,
    sequence: [
      { scale: 0, opacity: 0 },
      { scale: 1.2, opacity: 0.8 },
      { scale: 1, opacity: 1 }
    ],
    useNativeDriver: true,
  },

  // Nile River Flow - Smooth horizontal movement
  NILE_FLOW: {
    duration: ANIMATION_DURATION.SMOOTH,
    easing: ANIMATION_EASING.NILE_CURRENT,
    translateX: [SCREEN_WIDTH * 0.3, 0],
    opacity: [0, 1],
    useNativeDriver: true,
  },

  // Highland Sunrise - Vertical reveal
  HIGHLANDS_SUNRISE: {
    duration: ANIMATION_DURATION.EXTENDED,
    easing: ANIMATION_EASING.MESKEL_FLOW,
    translateY: [40, 0],
    opacity: [0, 1],
    scale: [0.95, 1],
    useNativeDriver: true,
  },

  // Coffee Ceremony - Sequential staggered animation
  COFFEE_BREW: {
    duration: ANIMATION_DURATION.SLOW,
    easing: ANIMATION_EASING.COFFEE_RHYTHM,
    stagger: 120,
    sequence: [
      { opacity: 0, translateY: 20 },
      { opacity: 1, translateY: 0 }
    ],
    useNativeDriver: true,
  },

  // Ethiopian Cross - Spiritual centered animation
  ETHIOPIAN_CROSS: {
    duration: ANIMATION_DURATION.DELIBERATE,
    easing: ANIMATION_EASING.EASE_OUT,
    scale: [0.8, 1.1, 1],
    rotate: ['-5deg', '2deg', '0deg'],
    useNativeDriver: true,
  },

  // Traditional Dance - Rhythmic bounce
  TRADITIONAL_DANCE: {
    duration: ANIMATION_DURATION.NORMAL,
    easing: ANIMATION_EASING.ELASTIC,
    translateY: [0, -8, 0],
    scale: [1, 1.05, 1],
    useNativeDriver: true,
  },
};

// ==================== ENTERPRISE ANIMATION SYSTEM ====================

/**
 * Comprehensive animation configuration system
 */
export const ENTERPRISE_ANIMATIONS = {
  // Authentication flow animations
  AUTHENTICATION: {
    WELCOME_SLIDE: {
      translateX: [SCREEN_WIDTH, 0],
      duration: ANIMATION_DURATION.SMOOTH,
      easing: ANIMATION_EASING.EASE_OUT,
      useNativeDriver: true,
    },
    LOGIN_FADE: {
      opacity: [0, 1],
      translateY: [20, 0],
      duration: ANIMATION_DURATION.NORMAL,
      easing: ANIMATION_EASING.EASE_OUT,
      useNativeDriver: true,
    },
    SUCCESS_CONFIRMATION: {
      scale: [0, 1.2, 1],
      opacity: [0, 1],
      duration: ANIMATION_DURATION.SLOW,
      easing: ANIMATION_EASING.ELASTIC,
      useNativeDriver: true,
    },
  },

  // Payment processing animations
  PAYMENT: {
    PROCESSING_SPINNER: {
      rotate: ['0deg', '360deg'],
      duration: ANIMATION_DURATION.SLOW,
      easing: ANIMATION_EASING.LINEAR,
      useNativeDriver: true,
      loop: true,
    },
    SUCCESS_CHECKMARK: {
      scale: [0, 1.2, 1],
      opacity: [0, 1],
      duration: ANIMATION_DURATION.NORMAL,
      easing: ANIMATION_EASING.ELASTIC,
      useNativeDriver: true,
    },
    FAILURE_SHAKE: {
      translateX: [0, -15, 15, -15, 15, 0],
      duration: ANIMATION_DURATION.QUICK,
      easing: ANIMATION_EASING.EASE_IN_OUT,
      useNativeDriver: true,
    },
  },

  // Construction project animations
  CONSTRUCTION: {
    PROGRESS_FILL: {
      width: [0, 1],
      duration: ANIMATION_DURATION.SLOW,
      easing: ANIMATION_EASING.EASE_OUT,
      useNativeDriver: false,
    },
    MILESTONE_COMPLETE: {
      scale: [1, 1.3, 1],
      opacity: [1, 0.8, 1],
      duration: ANIMATION_DURATION.NORMAL,
      easing: ANIMATION_EASING.BOUNCE,
      useNativeDriver: true,
    },
    WORKER_ASSIGNMENT: {
      translateX: [-50, 0],
      opacity: [0, 1],
      duration: ANIMATION_DURATION.NORMAL,
      easing: ANIMATION_EASING.EASE_OUT,
      useNativeDriver: true,
    },
  },

  // AI Matching animations
  AI_MATCHING: {
    SEARCH_PULSE: {
      scale: [1, 1.1, 1],
      opacity: [1, 0.7, 1],
      duration: ANIMATION_DURATION.SLOW,
      easing: ANIMATION_EASING.EASE_IN_OUT,
      useNativeDriver: true,
      loop: true,
    },
    MATCH_FOUND: {
      scale: [0, 1.5, 1],
      opacity: [0, 0.8, 1],
      duration: ANIMATION_DURATION.DELIBERATE,
      easing: ANIMATION_EASING.ELASTIC,
      useNativeDriver: true,
    },
    WORKER_CONNECT: {
      translateY: [20, 0],
      opacity: [0, 1],
      duration: ANIMATION_DURATION.NORMAL,
      easing: ANIMATION_EASING.EASE_OUT,
      useNativeDriver: true,
      stagger: 100,
    },
  },

  // Premium feature animations
  PREMIUM: {
    BADGE_GLOW: {
      opacity: [0.4, 0.8, 0.4],
      scale: [1, 1.1, 1],
      duration: ANIMATION_DURATION.SLOW,
      easing: ANIMATION_EASING.EASE_IN_OUT,
      useNativeDriver: true,
      loop: true,
    },
    FEATURE_UNLOCK: {
      scale: [0, 1.3, 1],
      rotate: ['-180deg', '10deg', '0deg'],
      duration: ANIMATION_DURATION.DELIBERATE,
      easing: ANIMATION_EASING.ELASTIC,
      useNativeDriver: true,
    },
    SPARKLE_EFFECT: {
      scale: [0, 1.5, 0],
      opacity: [0, 1, 0],
      duration: ANIMATION_DURATION.QUICK,
      easing: ANIMATION_EASING.EASE_OUT,
      useNativeDriver: true,
    },
  },

  // Chat and messaging animations
  CHAT: {
    MESSAGE_SEND: {
      translateX: [50, 0],
      opacity: [0, 1],
      duration: ANIMATION_DURATION.FAST,
      easing: ANIMATION_EASING.EASE_OUT,
      useNativeDriver: true,
    },
    MESSAGE_RECEIVE: {
      translateX: [-50, 0],
      opacity: [0, 1],
      duration: ANIMATION_DURATION.FAST,
      easing: ANIMATION_EASING.EASE_OUT,
      useNativeDriver: true,
    },
    TYPING_INDICATOR: {
      scale: [0.8, 1.2, 0.8],
      duration: ANIMATION_DURATION.NORMAL,
      easing: ANIMATION_EASING.EASE_IN_OUT,
      useNativeDriver: true,
      loop: true,
    },
  },
};

// ==================== ANIMATION ENGINE ====================

/**
 * Enterprise Animation Engine with performance optimization
 */
class AnimationEngine {
  constructor() {
    this.activeAnimations = new Map();
    this.animationQueue = [];
    this.isProcessingQueue = false;
  }

  /**
   * Create and manage animation with performance optimization
   */
  createAnimation(value, config, id = null) {
    const platformConfig = PLATFORM_CONFIG[Platform.OS.toUpperCase()] || PLATFORM_CONFIG.IOS;
    
    const animationConfig = {
      toValue: config.toValue,
      duration: (config.duration || ANIMATION_DURATION.NORMAL) * platformConfig.DURATION_MULTIPLIER,
      easing: config.easing || platformConfig.DEFAULT_EASING,
      useNativeDriver: config.useNativeDriver !== undefined ? config.useNativeDriver : platformConfig.USE_NATIVE_DRIVER,
      ...config,
    };

    const animation = Animated.timing(value, animationConfig);

    // Track animation if ID provided
    if (id) {
      this.activeAnimations.set(id, { animation, value });
    }

    return animation;
  }

  /**
   * Create spring animation for physical interactions
   */
  createSpring(value, config = {}) {
    return Animated.spring(value, {
      toValue: config.toValue || 1,
      tension: config.tension || 50,
      friction: config.friction || 7,
      velocity: config.velocity || 0,
      useNativeDriver: config.useNativeDriver !== false,
      ...config,
    });
  }

  /**
   * Create sequence with error handling
   */
  createSequence(animations, id = null) {
    const sequence = Animated.sequence(animations);
    
    if (id) {
      this.activeAnimations.set(id, { animation: sequence });
    }

    return sequence;
  }

  /**
   * Create parallel animations
   */
  createParallel(animations, id = null) {
    const parallel = Animated.parallel(animations, { stopTogether: false });
    
    if (id) {
      this.activeAnimations.set(id, { animation: parallel });
    }

    return parallel;
  }

  /**
   * Create staggered animations for lists
   */
  createStagger(animations, delay = 100, id = null) {
    const stagger = Animated.stagger(delay, animations);
    
    if (id) {
      this.activeAnimations.set(id, { animation: stagger });
    }

    return stagger;
  }

  /**
   * Create loop animation with control
   */
  createLoop(animation, iterations = -1, id = null) {
    const loop = Animated.loop(animation, { iterations });
    
    if (id) {
      this.activeAnimations.set(id, { animation: loop, isLoop: true });
    }

    return loop;
  }

  /**
   * Stop animation by ID
   */
  stopAnimation(id) {
    const active = this.activeAnimations.get(id);
    if (active) {
      active.animation.stop();
      active.value?.stopAnimation();
      this.activeAnimations.delete(id);
    }
  }

  /**
   * Stop all active animations
   */
  stopAllAnimations() {
    this.activeAnimations.forEach((animation, id) => {
      this.stopAnimation(id);
    });
  }

  /**
   * Queue animation for sequential execution
   */
  queueAnimation(animation, priority = 'normal') {
    this.animationQueue.push({ animation, priority });
    this.processAnimationQueue();
  }

  /**
   * Process animation queue
   */
  async processAnimationQueue() {
    if (this.isProcessingQueue || this.animationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.animationQueue.length > 0) {
      const { animation } = this.animationQueue.shift();
      await new Promise((resolve) => {
        animation.start(resolve);
      });
    }

    this.isProcessingQueue = false;
  }
}

// ==================== ANIMATION UTILITIES ====================

/**
 * Comprehensive animation utility functions
 */
export const AnimationUtils = {
  engine: new AnimationEngine(),

  /**
   * Create interpolated value with type safety
   */
  createInterpolation(value, inputRange, outputRange, extrapolate = 'clamp') {
    if (!value || !inputRange || !outputRange) {
      console.warn('Invalid interpolation parameters');
      return value;
    }

    return value.interpolate({
      inputRange,
      outputRange,
      extrapolate,
    });
  },

  /**
   * Create Ethiopian-inspired animation
   */
  createEthiopianAnimation(type, animatedValues, customConfig = {}) {
    const preset = ETHIOPIAN_ANIMATIONS[type];
    if (!preset) {
      console.warn(`Ethiopian animation preset not found: ${type}`);
      return null;
    }

    const config = { ...preset, ...customConfig };
    const animations = [];

    // Handle scale animation
    if (config.scale && animatedValues.scale) {
      animations.push(
        AnimationUtils.engine.createAnimation(animatedValues.scale, {
          toValue: config.scale[config.scale.length - 1],
          duration: config.duration,
          easing: config.easing,
          useNativeDriver: config.useNativeDriver,
        })
      );
    }

    // Handle opacity animation
    if (config.opacity && animatedValues.opacity) {
      animations.push(
        AnimationUtils.engine.createAnimation(animatedValues.opacity, {
          toValue: config.opacity[config.opacity.length - 1],
          duration: config.duration,
          easing: config.easing,
          useNativeDriver: config.useNativeDriver,
        })
      );
    }

    // Handle translation animations
    if (config.translateX && animatedValues.translateX) {
      animations.push(
        AnimationUtils.engine.createAnimation(animatedValues.translateX, {
          toValue: config.translateX[config.translateX.length - 1],
          duration: config.duration,
          easing: config.easing,
          useNativeDriver: config.useNativeDriver,
        })
      );
    }

    if (config.translateY && animatedValues.translateY) {
      animations.push(
        AnimationUtils.engine.createAnimation(animatedValues.translateY, {
          toValue: config.translateY[config.translateY.length - 1],
          duration: config.duration,
          easing: config.easing,
          useNativeDriver: config.useNativeDriver,
        })
      );
    }

    return AnimationUtils.engine.createParallel(animations);
  },

  /**
   * Create button press animation with haptic feedback simulation
   */
  createButtonPressAnimation(scaleValue, opacityValue = null) {
    const pressIn = AnimationUtils.engine.createAnimation(scaleValue, {
      toValue: 0.95,
      duration: ANIMATION_DURATION.FAST,
      easing: ANIMATION_EASING.SHARP_IN,
    });

    const pressOut = AnimationUtils.engine.createAnimation(scaleValue, {
      toValue: 1,
      duration: ANIMATION_DURATION.NORMAL,
      easing: ANIMATION_EASING.ELASTIC,
    });

    if (opacityValue) {
      const fadeIn = AnimationUtils.engine.createAnimation(opacityValue, {
        toValue: 0.8,
        duration: ANIMATION_DURATION.FAST,
      });

      const fadeOut = AnimationUtils.engine.createAnimation(opacityValue, {
        toValue: 1,
        duration: ANIMATION_DURATION.NORMAL,
      });

      return AnimationUtils.engine.createSequence([
        AnimationUtils.engine.createParallel([pressIn, fadeIn]),
        AnimationUtils.engine.createParallel([pressOut, fadeOut]),
      ]);
    }

    return AnimationUtils.engine.createSequence([pressIn, pressOut]);
  },

  /**
   * Create loading spinner with Ethiopian rhythm
   */
  createLoadingAnimation(rotateValue, pulseValue = null) {
    const rotateAnimation = AnimationUtils.engine.createLoop(
      AnimationUtils.engine.createAnimation(rotateValue, {
        toValue: 1,
        duration: ANIMATION_DURATION.SLOW,
        easing: ANIMATION_EASING.LINEAR,
      })
    );

    if (pulseValue) {
      const pulseAnimation = AnimationUtils.engine.createLoop(
        AnimationUtils.engine.createSequence([
          AnimationUtils.engine.createAnimation(pulseValue, {
            toValue: 0.6,
            duration: ANIMATION_DURATION.NORMAL,
            easing: ANIMATION_EASING.EASE_IN_OUT,
          }),
          AnimationUtils.engine.createAnimation(pulseValue, {
            toValue: 1,
            duration: ANIMATION_DURATION.NORMAL,
            easing: ANIMATION_EASING.EASE_IN_OUT,
          }),
        ])
      );

      return AnimationUtils.engine.createParallel([rotateAnimation, pulseAnimation]);
    }

    return rotateAnimation;
  },

  /**
   * Create shake animation for validation errors
   */
  createShakeAnimation(translateXValue) {
    return AnimationUtils.engine.createSequence([
      AnimationUtils.engine.createAnimation(translateXValue, {
        toValue: 8,
        duration: ANIMATION_DURATION.FAST,
        easing: ANIMATION_EASING.SHARP_IN,
      }),
      AnimationUtils.engine.createAnimation(translateXValue, {
        toValue: -8,
        duration: ANIMATION_DURATION.FAST,
        easing: ANIMATION_EASING.SHARP_IN,
      }),
      AnimationUtils.engine.createAnimation(translateXValue, {
        toValue: 6,
        duration: ANIMATION_DURATION.FAST,
        easing: ANIMATION_EASING.SHARP_IN,
      }),
      AnimationUtils.engine.createAnimation(translateXValue, {
        toValue: -6,
        duration: ANIMATION_DURATION.FAST,
        easing: ANIMATION_EASING.SHARP_IN,
      }),
      AnimationUtils.engine.createAnimation(translateXValue, {
        toValue: 0,
        duration: ANIMATION_DURATION.FAST,
        easing: ANIMATION_EASING.EASE_OUT,
      }),
    ]);
  },

  /**
   * Create list item entrance animation
   */
  createListEntranceAnimation(index, totalItems = 10) {
    const delay = Math.min(index * 80, 400); // Cap delay to prevent long waits
    const opacity = new Animated.Value(0);
    const translateY = new Animated.Value(20);

    const entranceAnimation = AnimationUtils.engine.createParallel([
      AnimationUtils.engine.createAnimation(opacity, {
        toValue: 1,
        duration: ANIMATION_DURATION.NORMAL,
        easing: ANIMATION_EASING.EASE_OUT,
      }),
      AnimationUtils.engine.createAnimation(translateY, {
        toValue: 0,
        duration: ANIMATION_DURATION.NORMAL,
        easing: ANIMATION_EASING.EASE_OUT,
      }),
    ]);

    // Start animation after delay
    setTimeout(() => {
      entranceAnimation.start();
    }, delay);

    return { opacity, translateY };
  },

  /**
   * Create progress animation with smooth easing
   */
  createProgressAnimation(progressValue, targetValue, duration = ANIMATION_DURATION.SLOW) {
    return AnimationUtils.engine.createAnimation(progressValue, {
      toValue: targetValue,
      duration,
      easing: ANIMATION_EASING.EASE_OUT,
      useNativeDriver: false,
    });
  },

  /**
   * Create celebration animation for achievements
   */
  createCelebrationAnimation(animatedValues) {
    const { scale, opacity, rotate } = animatedValues;
    
    return AnimationUtils.engine.createSequence([
      // Initial pop
      AnimationUtils.engine.createParallel([
        AnimationUtils.engine.createAnimation(scale, {
          toValue: 1.5,
          duration: ANIMATION_DURATION.FAST,
          easing: ANIMATION_EASING.EASE_OUT,
        }),
        AnimationUtils.engine.createAnimation(opacity, {
          toValue: 1,
          duration: ANIMATION_DURATION.FAST,
        }),
      ]),
      // Bounce back with rotation
      AnimationUtils.engine.createParallel([
        AnimationUtils.engine.createAnimation(scale, {
          toValue: 1,
          duration: ANIMATION_DURATION.NORMAL,
          easing: ANIMATION_EASING.BOUNCE,
        }),
        AnimationUtils.engine.createAnimation(rotate, {
          toValue: 1,
          duration: ANIMATION_DURATION.NORMAL,
          easing: ANIMATION_EASING.ELASTIC,
        }),
      ]),
    ]);
  },
};

// ==================== ANIMATION HOOKS ====================

/**
 * React hooks for common animation patterns
 */
export const useAnimation = () => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const translateYAnim = React.useRef(new Animated.Value(0)).current;

  const fadeIn = (duration = ANIMATION_DURATION.NORMAL) => {
    return AnimationUtils.engine.createAnimation(fadeAnim, {
      toValue: 1,
      duration,
      easing: ANIMATION_EASING.EASE_OUT,
    });
  };

  const fadeOut = (duration = ANIMATION_DURATION.FAST) => {
    return AnimationUtils.engine.createAnimation(fadeAnim, {
      toValue: 0,
      duration,
      easing: ANIMATION_EASING.EASE_IN,
    });
  };

  const scaleTo = (value, duration = ANIMATION_DURATION.NORMAL) => {
    return AnimationUtils.engine.createAnimation(scaleAnim, {
      toValue: value,
      duration,
      easing: ANIMATION_EASING.EASE_OUT,
    });
  };

  const slideUp = (distance = 20, duration = ANIMATION_DURATION.NORMAL) => {
    return AnimationUtils.engine.createAnimation(translateYAnim, {
      toValue: -distance,
      duration,
      easing: ANIMATION_EASING.EASE_OUT,
    });
  };

  const slideDown = (distance = 20, duration = ANIMATION_DURATION.NORMAL) => {
    return AnimationUtils.engine.createAnimation(translateYAnim, {
      toValue: distance,
      duration,
      easing: ANIMATION_EASING.EASE_OUT,
    });
  };

  return {
    values: { fadeAnim, scaleAnim, translateYAnim },
    methods: { fadeIn, fadeOut, scaleTo, slideUp, slideDown },
  };
};

// ==================== ANIMATION STYLES ====================

/**
 * Pre-computed animation style combinations
 */
export const AnimationStyles = {
  // Basic transforms
  transform: {
    scale: (value) => ({ transform: [{ scale: value }] }),
    translateX: (value) => ({ transform: [{ translateX: value }] }),
    translateY: (value) => ({ transform: [{ translateY: value }] }),
    rotate: (value) => ({ transform: [{ rotate: value }] }),
    rotateY: (value) => ({ transform: [{ rotateY: value }] }),
  },

  // Combined transforms
  combined: {
    scaleAndTranslate: (scale, translateY) => ({
      transform: [{ scale }, { translateY }],
    }),
    slideAndFade: (translateY, opacity) => ({
      opacity,
      transform: [{ translateY }],
    }),
    bounce: (scale, translateY) => ({
      transform: [{ scale }, { translateY }],
    }),
  },

  // Ethiopian animation styles
  ethiopian: {
    meskelFlower: (scale, opacity) => ({
      opacity,
      transform: [{ scale }],
    }),
    nileFlow: (translateX, opacity) => ({
      opacity,
      transform: [{ translateX }],
    }),
    highlandSunrise: (translateY, opacity, scale) => ({
      opacity,
      transform: [{ translateY }, { scale }],
    }),
  },

  // Component-specific styles
  components: {
    button: (scale, opacity = 1) => ({
      opacity,
      transform: [{ scale }],
    }),
    card: (translateY, opacity, scale = 1) => ({
      opacity,
      transform: [{ translateY }, { scale }],
    }),
    input: (scale, translateX = 0) => ({
      transform: [{ scale }, { translateX }],
    }),
    badge: (scale, opacity) => ({
      opacity,
      transform: [{ scale }],
    }),
  },
};

// ==================== PERFORMANCE OPTIMIZATIONS ====================

/**
 * Performance monitoring and optimization
 */
export const AnimationPerformance = {
  // Monitor animation frame rates
  monitorFrameRate: (animationId) => {
    if (__DEV__) {
      let frameCount = 0;
      let startTime = Date.now();

      const monitor = () => {
        frameCount++;
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;

        if (elapsed >= 1000) {
          const fps = (frameCount * 1000) / elapsed;
          console.log(`Animation ${animationId}: ${fps.toFixed(1)} FPS`);
          frameCount = 0;
          startTime = currentTime;
        }

        requestAnimationFrame(monitor);
      };

      monitor();
    }
  },

  // Batch animations for better performance
  createBatchAnimation: (animations, batchSize = 3) => {
    const batches = [];
    for (let i = 0; i < animations.length; i += batchSize) {
      batches.push(animations.slice(i, i + batchSize));
    }

    return batches.reduce((sequence, batch) => {
      return sequence.then(() => Promise.all(batch.map(anim => new Promise(resolve => anim.start(resolve)))));
    }, Promise.resolve());
  },

  // Pre-warm animations for smoother startup
  prewarmAnimations: () => {
    // Create and immediately stop animations to warm up the system
    if (Platform.OS === 'android') {
      const testValue = new Animated.Value(0);
      const testAnimation = Animated.timing(testValue, {
        toValue: 1,
        duration: 1,
        useNativeDriver: true,
      });

      testAnimation.start();
      testAnimation.stop();
    }
  },
};

// ==================== EXPORT MAIN ANIMATION SYSTEM ====================

export default {
  // Constants
  ANIMATION_DURATION,
  ANIMATION_EASING,
  PLATFORM_CONFIG,
  
  // Presets
  ETHIOPIAN_ANIMATIONS,
  ENTERPRISE_ANIMATIONS,
  
  // Engine and Utilities
  AnimationEngine,
  AnimationUtils,
  
  // Hooks and Styles
  useAnimation,
  AnimationStyles,
  
  // Performance
  AnimationPerformance,
};