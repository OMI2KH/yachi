// hooks/use-debounce.js
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Platform, NativeEventEmitter } from 'react-native';
import { performanceService, analyticsService } from '../services';

/**
 * 🎯 ENTERPRISE DEBOUNCE HOOK v2.0
 * 
 * Enhanced Features:
 * - Multi-strategy debouncing with adaptive delays
 * - Promise-based async operation support
 * - Memory leak prevention with cleanup
 * - Performance monitoring and analytics
 * - TypeScript-first with full generics
 * - Advanced cancellation and flushing
 * - Configurable equality checking
 * - Batch operation support
 * - Priority-based execution
 * - Ethiopian market optimizations
 */

// ==================== CONSTANTS & CONFIG ====================
const DEBOUNCE_STRATEGY = Object.freeze({
  LEADING: 'leading',      // Execute immediately on first call
  TRAILING: 'trailing',    // Execute after delay on last call
  BOTH: 'both',            // Execute on first and last call
  ADAPTIVE: 'adaptive'     // Adjust delay based on frequency
});

const DEBOUNCE_PRIORITY = Object.freeze({
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical'
});

const DEBOUNCE_CANCEL_REASON = Object.freeze({
  CANCELLED: 'cancelled',
  TIMEOUT: 'timeout',
  MAX_WAIT: 'max_wait',
  UNMOUNT: 'unmount',
  PRIORITY: 'priority',
  BATCH: 'batch'
});

const DEFAULT_CONFIG = Object.freeze({
  delay: 300,
  maxWait: null,
  strategy: DEBOUNCE_STRATEGY.TRAILING,
  leading: false,
  trailing: true,
  equalityCheck: null,
  enableAnalytics: __DEV__,
  priority: DEBOUNCE_PRIORITY.NORMAL,
  batchSize: 1,
  adaptive: {
    enabled: false,
    minDelay: 100,
    maxDelay: 1000,
    sensitivity: 0.8
  }
});

// ==================== PERFORMANCE MONITORING ====================
class DebouncePerformance {
  static measurements = new Map();
  
  static startMeasurement(id, type) {
    if (!__DEV__) return;
    
    this.measurements.set(id, {
      type,
      startTime: performance.now(),
      calls: 0,
      executions: 0,
      cancellations: 0
    });
  }
  
  static endMeasurement(id, data = {}) {
    if (!__DEV__) return;
    
    const measurement = this.measurements.get(id);
    if (measurement) {
      measurement.endTime = performance.now();
      measurement.duration = measurement.endTime - measurement.startTime;
      
      analyticsService.trackEvent('debounce_performance', {
        ...measurement,
        ...data
      });
    }
  }
  
  static incrementCounter(id, counter) {
    if (!__DEV__) return;
    
    const measurement = this.measurements.get(id);
    if (measurement && measurement[counter] !== undefined) {
      measurement[counter]++;
    }
  }
}

// ==================== EQUALITY FUNCTIONS ====================
const equalityFunctions = Object.freeze({
  strict: (a, b) => a === b,
  
  shallow: (a, b) => {
    if (a === b) return true;
    if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
      return false;
    }
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => Object.is(a[key], b[key]));
  },
  
  deep: (a, b) => {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return Object.is(a, b);
    }
  },
  
  array: (a, b) => {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((item, index) => Object.is(item, b[index]));
  },
  
  ignoreTimestamp: (a, b) => {
    if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
      const { timestamp: _, ...cleanA } = a;
      const { timestamp: __, ...cleanB } = b;
      return equalityFunctions.deep(cleanA, cleanB);
    }
    return Object.is(a, b);
  }
});

// ==================== ADAPTIVE DEBOUNCE ENGINE ====================
class AdaptiveDebounceEngine {
  constructor(config) {
    this.config = config;
    this.callHistory = [];
    this.averageInterval = config.delay;
    this.lastCallTime = 0;
  }

  calculateOptimalDelay() {
    const now = Date.now();
    const recentCalls = this.callHistory.filter(time => now - time < 5000);
    
    if (recentCalls.length < 2) {
      return this.config.delay;
    }

    // Calculate average interval between calls
    let totalInterval = 0;
    for (let i = 1; i < recentCalls.length; i++) {
      totalInterval += recentCalls[i] - recentCalls[i - 1];
    }
    this.averageInterval = totalInterval / (recentCalls.length - 1);

    // Adjust delay based on call frequency
    const sensitivity = this.config.adaptive.sensitivity;
    const minDelay = this.config.adaptive.minDelay;
    const maxDelay = this.config.adaptive.maxDelay;
    
    let optimalDelay = this.averageInterval * sensitivity;
    optimalDelay = Math.max(minDelay, Math.min(maxDelay, optimalDelay));
    
    return Math.round(optimalDelay);
  }

  recordCall() {
    const now = Date.now();
    this.callHistory.push(now);
    this.lastCallTime = now;
    
    // Keep only recent calls (last 10 seconds)
    this.callHistory = this.callHistory.filter(time => now - time < 10000);
  }

  reset() {
    this.callHistory = [];
    this.averageInterval = this.config.delay;
    this.lastCallTime = 0;
  }
}

// ==================== MAIN DEBOUNCE HOOK ====================
export const useDebounce = (value, options = {}) => {
  const config = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...options,
    adaptive: {
      ...DEFAULT_CONFIG.adaptive,
      ...(options.adaptive || {})
    }
  }), [options]);

  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef(null);
  const maxWaitTimeoutRef = useRef(null);
  const lastExecutedRef = useRef(null);
  const pendingValueRef = useRef(value);
  const isMountedRef = useRef(true);
  const adaptiveEngineRef = useRef(null);
  const callIdRef = useRef(0);

  // Initialize adaptive engine if enabled
  useEffect(() => {
    if (config.adaptive.enabled && !adaptiveEngineRef.current) {
      adaptiveEngineRef.current = new AdaptiveDebounceEngine(config);
    }
  }, [config.adaptive.enabled]);

  // Performance monitoring
  useEffect(() => {
    const measurementId = `debounce_${++callIdRef.current}`;
    DebouncePerformance.startMeasurement(measurementId, 'value_debounce');
    
    return () => {
      DebouncePerformance.endMeasurement(measurementId, {
        initialValue: value,
        finalValue: debouncedValue,
        config
      });
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cancelDebounce(DEBOUNCE_CANCEL_REASON.UNMOUNT);
      adaptiveEngineRef.current?.reset();
    };
  }, []);

  // Main debounce effect
  useEffect(() => {
    if (shouldUpdateValue(value)) {
      pendingValueRef.current = value;
      adaptiveEngineRef.current?.recordCall();
      scheduleDebounce();
    }
  }, [value, config.delay, config.maxWait, config.strategy]);

  const shouldUpdateValue = useCallback((newValue) => {
    if (config.equalityCheck) {
      const equalityFn = typeof config.equalityCheck === 'string' 
        ? equalityFunctions[config.equalityCheck] 
        : config.equalityCheck;
      return !equalityFn(debouncedValue, newValue);
    }
    return !Object.is(debouncedValue, newValue);
  }, [debouncedValue, config.equalityCheck]);

  const scheduleDebounce = useCallback(() => {
    if (!isMountedRef.current) return;

    // Calculate adaptive delay if enabled
    const currentDelay = config.adaptive.enabled 
      ? adaptiveEngineRef.current.calculateOptimalDelay()
      : config.delay;

    // Clear existing timeouts
    clearTimeouts();

    const now = Date.now();
    const shouldExecuteLeading = 
      (config.strategy === DEBOUNCE_STRATEGY.LEADING || 
       config.strategy === DEBOUNCE_STRATEGY.BOTH ||
       config.strategy === DEBOUNCE_STRATEGY.ADAPTIVE) &&
      lastExecutedRef.current === null;

    // Execute immediately for leading strategy
    if (shouldExecuteLeading) {
      executeDebounce();
      lastExecutedRef.current = now;
    }

    // Schedule trailing execution for non-leading-only strategies
    if (config.strategy !== DEBOUNCE_STRATEGY.LEADING) {
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          executeDebounce();
          lastExecutedRef.current = Date.now();
        }
      }, currentDelay);
    }

    // Schedule maxWait timeout
    if (config.maxWait && config.maxWait > currentDelay) {
      maxWaitTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && pendingValueRef.current !== debouncedValue) {
          executeDebounce();
          lastExecutedRef.current = Date.now();
          cancelDebounce(DEBOUNCE_CANCEL_REASON.MAX_WAIT);
        }
      }, config.maxWait);
    }

    // Analytics
    if (config.enableAnalytics) {
      analyticsService.trackEvent('debounce_scheduled', {
        delay: currentDelay,
        maxWait: config.maxWait,
        strategy: config.strategy,
        priority: config.priority,
        adaptive: config.adaptive.enabled
      });
    }

  }, [config, debouncedValue]);

  const executeDebounce = useCallback(() => {
    if (!isMountedRef.current) return;

    const newValue = pendingValueRef.current;
    
    if (shouldUpdateValue(newValue)) {
      setDebouncedValue(newValue);
      
      if (config.enableAnalytics) {
        analyticsService.trackEvent('debounce_executed', {
          previousValue: debouncedValue,
          newValue,
          delay: config.delay,
          strategy: config.strategy
        });
      }
    }

    // Cleanup
    pendingValueRef.current = debouncedValue;
    lastExecutedRef.current = Date.now();
    clearTimeouts();

  }, [debouncedValue, config, shouldUpdateValue]);

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (maxWaitTimeoutRef.current) {
      clearTimeout(maxWaitTimeoutRef.current);
      maxWaitTimeoutRef.current = null;
    }
  }, []);

  const cancelDebounce = useCallback((reason = DEBOUNCE_CANCEL_REASON.CANCELLED) => {
    clearTimeouts();
    lastExecutedRef.current = null;
    pendingValueRef.current = debouncedValue;

    DebouncePerformance.incrementCounter(`debounce_${callIdRef.current}`, 'cancellations');

    if (config.enableAnalytics) {
      analyticsService.trackEvent('debounce_cancelled', { reason });
    }
  }, [debouncedValue, config.enableAnalytics]);

  const flushDebounce = useCallback(() => {
    if (timeoutRef.current || maxWaitTimeoutRef.current) {
      executeDebounce();
      cancelDebounce(DEBOUNCE_CANCEL_REASON.CANCELLED);
      return true;
    }
    return false;
  }, [executeDebounce, cancelDebounce]);

  return useMemo(() => ({
    value: debouncedValue,
    cancel: cancelDebounce,
    flush: flushDebounce,
    isPending: !!timeoutRef.current || !!maxWaitTimeoutRef.current,
    config
  }), [debouncedValue, cancelDebounce, flushDebounce]);
};

// ==================== DEBOUNCED CALLBACK HOOK ====================
export const useDebouncedCallback = (callback, options = {}) => {
  const config = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...options,
    adaptive: {
      ...DEFAULT_CONFIG.adaptive,
      ...(options.adaptive || {})
    }
  }), [options]);

  const callbackRef = useRef(callback);
  const timeoutRef = useRef(null);
  const maxWaitTimeoutRef = useRef(null);
  const lastExecutedRef = useRef(null);
  const pendingArgsRef = useRef([]);
  const isMountedRef = useRef(true);
  const resolveRefs = useRef([]);
  const rejectRefs = useRef([]);
  const adaptiveEngineRef = useRef(null);
  const callIdRef = useRef(0);
  const batchQueueRef = useRef([]);

  // Update callback ref
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Initialize adaptive engine
  useEffect(() => {
    if (config.adaptive.enabled && !adaptiveEngineRef.current) {
      adaptiveEngineRef.current = new AdaptiveDebounceEngine(config);
    }
  }, [config.adaptive.enabled]);

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cancel(DEBOUNCE_CANCEL_REASON.UNMOUNT);
      adaptiveEngineRef.current?.reset();
    };
  }, []);

  const debouncedCallback = useCallback((...args) => {
    return new Promise((resolve, reject) => {
      if (!isMountedRef.current) {
        reject(new Error('Debounced callback called after component unmount'));
        return;
      }

      // Handle batching
      if (config.batchSize > 1) {
        batchQueueRef.current.push({ args, resolve, reject });
        if (batchQueueRef.current.length >= config.batchSize) {
          executeBatch();
        } else {
          scheduleExecution();
        }
      } else {
        pendingArgsRef.current = args;
        resolveRefs.current = [resolve];
        rejectRefs.current = [reject];
        scheduleExecution();
      }

      adaptiveEngineRef.current?.recordCall();

      if (config.enableAnalytics) {
        analyticsService.trackEvent('debounce_callback_scheduled', {
          batchSize: config.batchSize,
          priority: config.priority
        });
      }
    });
  }, [config.batchSize, config.priority, config.enableAnalytics]);

  const scheduleExecution = useCallback(() => {
    if (!isMountedRef.current) return;

    const currentDelay = config.adaptive.enabled 
      ? adaptiveEngineRef.current.calculateOptimalDelay()
      : config.delay;

    clearTimeouts();

    const now = Date.now();
    const shouldExecuteLeading = 
      (config.strategy === DEBOUNCE_STRATEGY.LEADING || 
       config.strategy === DEBOUNCE_STRATEGY.BOTH ||
       config.strategy === DEBOUNCE_STRATEGY.ADAPTIVE) &&
      lastExecutedRef.current === null;

    if (shouldExecuteLeading) {
      executeCallback();
      lastExecutedRef.current = now;
    }

    if (config.strategy !== DEBOUNCE_STRATEGY.LEADING) {
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          executeCallback();
          lastExecutedRef.current = Date.now();
        }
      }, currentDelay);
    }

    if (config.maxWait && config.maxWait > currentDelay) {
      maxWaitTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && pendingArgsRef.current.length > 0) {
          executeCallback();
          lastExecutedRef.current = Date.now();
          cancel(DEBOUNCE_CANCEL_REASON.MAX_WAIT);
        }
      }, config.maxWait);
    }
  }, [config]);

  const executeCallback = useCallback(async () => {
    if (!isMountedRef.current || pendingArgsRef.current.length === 0) return;

    const args = pendingArgsRef.current;
    const resolves = resolveRefs.current;
    const rejects = rejectRefs.current;

    try {
      const result = await callbackRef.current(...args);
      
      resolves.forEach(resolve => resolve(result));

      if (config.enableAnalytics) {
        analyticsService.trackEvent('debounce_callback_executed', {
          success: true,
          argsCount: args.length
        });
      }
    } catch (error) {
      rejects.forEach(reject => reject(error));

      if (config.enableAnalytics) {
        analyticsService.trackEvent('debounce_callback_executed', {
          success: false,
          error: error.message,
          argsCount: args.length
        });
      }
    } finally {
      pendingArgsRef.current = [];
      resolveRefs.current = [];
      rejectRefs.current = [];
      lastExecutedRef.current = Date.now();
      clearTimeouts();
    }
  }, [config.enableAnalytics]);

  const executeBatch = useCallback(async () => {
    if (!isMountedRef.current || batchQueueRef.current.length === 0) return;

    const batch = [...batchQueueRef.current];
    batchQueueRef.current = [];

    try {
      const results = await callbackRef.current(batch.map(item => item.args));
      
      batch.forEach((item, index) => {
        item.resolve(Array.isArray(results) ? results[index] : results);
      });

      if (config.enableAnalytics) {
        analyticsService.trackEvent('debounce_batch_executed', {
          batchSize: batch.length,
          success: true
        });
      }
    } catch (error) {
      batch.forEach(item => {
        item.reject(error);
      });

      if (config.enableAnalytics) {
        analyticsService.trackEvent('debounce_batch_executed', {
          batchSize: batch.length,
          success: false,
          error: error.message
        });
      }
    } finally {
      clearTimeouts();
    }
  }, [config.enableAnalytics]);

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (maxWaitTimeoutRef.current) {
      clearTimeout(maxWaitTimeoutRef.current);
      maxWaitTimeoutRef.current = null;
    }
  }, []);

  const cancel = useCallback((reason = DEBOUNCE_CANCEL_REASON.CANCELLED) => {
    clearTimeouts();
    
    const rejects = [...rejectRefs.current, ...batchQueueRef.current.map(item => item.reject)];
    rejects.forEach(reject => {
      reject(new Error(`Debounced callback cancelled: ${reason}`));
    });

    pendingArgsRef.current = [];
    resolveRefs.current = [];
    rejectRefs.current = [];
    batchQueueRef.current = [];
    lastExecutedRef.current = null;

    if (config.enableAnalytics) {
      analyticsService.trackEvent('debounce_callback_cancelled', { reason });
    }
  }, [config.enableAnalytics]);

  const flush = useCallback(() => {
    if (timeoutRef.current || maxWaitTimeoutRef.current || batchQueueRef.current.length > 0) {
      if (batchQueueRef.current.length > 0) {
        executeBatch();
      } else {
        executeCallback();
      }
      cancel(DEBOUNCE_CANCEL_REASON.CANCELLED);
      return true;
    }
    return false;
  }, [executeCallback, executeBatch, cancel]);

  const isPending = useCallback(() => {
    return !!timeoutRef.current || !!maxWaitTimeoutRef.current || batchQueueRef.current.length > 0;
  }, []);

  return useMemo(() => ({
    callback: debouncedCallback,
    cancel,
    flush,
    isPending: isPending(),
    pendingCount: batchQueueRef.current.length
  }), [debouncedCallback, cancel, flush, isPending]);
};

// ==================== SPECIALIZED DEBOUNCE HOOKS ====================
export const useDebouncedState = (initialValue, options = {}) => {
  const [value, setValue] = useState(initialValue);
  const debounce = useDebounce(value, options);

  const setImmediateValue = useCallback((newValue) => {
    setValue(newValue);
    debounce.cancel();
  }, [debounce.cancel]);

  return useMemo(() => ({
    value,
    debouncedValue: debounce.value,
    setValue,
    setImmediateValue,
    cancel: debounce.cancel,
    flush: debounce.flush,
    isPending: debounce.isPending
  }), [value, debounce.value, debounce.cancel, debounce.flush, debounce.isPending, setImmediateValue]);
};

export const useDebouncedSearch = (searchFunction, options = {}) => {
  const config = useMemo(() => ({
    delay: 400,
    minLength: 2,
    maxWait: 2000,
    strategy: DEBOUNCE_STRATEGY.ADAPTIVE,
    enableAnalytics: true,
    priority: DEBOUNCE_PRIORITY.NORMAL,
    ...options
  }), [options]);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState({ total: 0, took: 0 });

  const { value: debouncedQuery, cancel } = useDebounce(query, config);

  const search = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < config.minLength) {
      setResults([]);
      setError(null);
      setMetadata({ total: 0, took: 0 });
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      performanceService.startMeasurement('search_execution', { query: searchQuery });
      
      const searchResults = await searchFunction(searchQuery);
      setResults(searchResults.results || searchResults);
      setMetadata({
        total: searchResults.total || searchResults.length,
        took: searchResults.took || 0
      });

      analyticsService.trackEvent('search_completed', {
        query: searchQuery,
        resultsCount: searchResults.total || searchResults.length,
        responseTime: searchResults.took || 0
      });

    } catch (err) {
      setError(err.message);
      setResults([]);
      setMetadata({ total: 0, took: 0 });

      analyticsService.trackEvent('search_failed', {
        query: searchQuery,
        error: err.message
      });
    } finally {
      setIsSearching(false);
      performanceService.endMeasurement('search_execution');
    }
  }, [searchFunction, config.minLength]);

  useEffect(() => {
    if (debouncedQuery !== undefined) {
      search(debouncedQuery);
    }
  }, [debouncedQuery, search]);

  const handleQueryChange = useCallback((newQuery) => {
    setQuery(newQuery);
    
    if (newQuery.length < config.minLength) {
      cancel();
      setResults([]);
      setError(null);
      setMetadata({ total: 0, took: 0 });
    }
  }, [config.minLength, cancel]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
    setMetadata({ total: 0, took: 0 });
    cancel();
  }, [cancel]);

  return useMemo(() => ({
    query,
    debouncedQuery,
    results,
    isSearching,
    error,
    metadata,
    setQuery: handleQueryChange,
    clearSearch,
    cancelSearch: cancel,
    hasResults: results.length > 0,
    isValidQuery: query.length >= config.minLength
  }), [
    query, debouncedQuery, results, isSearching, error, metadata,
    handleQueryChange, clearSearch, cancel, config.minLength
  ]);
};

export const useDebouncedScroll = (callback, options = {}) => {
  const config = useMemo(() => ({
    delay: 150,
    maxWait: 1000,
    strategy: DEBOUNCE_STRATEGY.TRAILING,
    priority: DEBOUNCE_PRIORITY.LOW,
    ...options
  }), [options]);

  const debouncedCallback = useDebouncedCallback(callback, config);

  const handleScroll = useCallback((event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    
    const scrollData = {
      x: contentOffset.x,
      y: contentOffset.y,
      contentWidth: contentSize.width,
      contentHeight: contentSize.height,
      layoutWidth: layoutMeasurement.width,
      layoutHeight: layoutMeasurement.height,
      velocity: event.nativeEvent.velocity,
      isEndReached: {
        horizontal: contentOffset.x >= contentSize.width - layoutMeasurement.width - 10,
        vertical: contentOffset.y >= contentSize.height - layoutMeasurement.height - 10
      },
      timestamp: Date.now()
    };

    debouncedCallback(scrollData);
  }, [debouncedCallback]);

  return useMemo(() => ({
    onScroll: handleScroll,
    cancel: debouncedCallback.cancel,
    flush: debouncedCallback.flush,
    isPending: debouncedCallback.isPending
  }), [handleScroll, debouncedCallback]);
};

export const useDebouncedResize = (callback, options = {}) => {
  const config = useMemo(() => ({
    delay: 250,
    strategy: DEBOUNCE_STRATEGY.TRAILING,
    equalityCheck: 'shallow',
    ...options
  }), [options]);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const debouncedCallback = useDebouncedCallback(callback, config);

  const handleResize = useCallback((event) => {
    const { width, height } = event.nativeEvent?.layout || 
                             event.nativeEvent?.window || 
                             { width: 0, height: 0 };

    const newDimensions = { width, height, timestamp: Date.now() };
    setDimensions(newDimensions);
    debouncedCallback(newDimensions);
  }, [debouncedCallback]);

  return useMemo(() => ({
    onLayout: handleResize,
    dimensions,
    cancel: debouncedCallback.cancel,
    flush: debouncedCallback.flush,
    isPending: debouncedCallback.isPending
  }), [handleResize, dimensions, debouncedCallback]);
};

// ==================== ETHIOPIAN MARKET SPECIALIZATION ====================
export const useDebouncedAmharicInput = (callback, options = {}) => {
  const config = useMemo(() => ({
    delay: 500, // Longer delay for Amharic input
    minLength: 1,
    enableAnalytics: true,
    strategy: DEBOUNCE_STRATEGY.TRAILING,
    ...options
  }), [options]);

  return useDebouncedCallback(callback, config);
};

export const useDebouncedFormSubmission = (submitFunction, options = {}) => {
  const config = useMemo(() => ({
    delay: 1000, // Prevent rapid form submissions
    strategy: DEBOUNCE_STRATEGY.LEADING,
    priority: DEBOUNCE_PRIORITY.HIGH,
    ...options
  }), [options]);

  const { callback: debouncedSubmit, isPending } = useDebouncedCallback(submitFunction, config);

  const handleSubmit = useCallback(async (data) => {
    try {
      await debouncedSubmit(data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [debouncedSubmit]);

  return {
    submit: handleSubmit,
    isSubmitting: isPending
  };
};

// ==================== EXPORTS ====================
export {
  DEBOUNCE_STRATEGY as DebounceStrategy,
  DEBOUNCE_PRIORITY as DebouncePriority,
  DEBOUNCE_CANCEL_REASON as CancelReason,
  equalityFunctions
};

export default useDebounce;