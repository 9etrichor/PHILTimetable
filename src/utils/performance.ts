import { useCallback } from 'react'

// Performance monitoring utilities for tracking page load times and API calls

export interface PerformanceMetrics {
  pageLoad: number
  apiCalls: number
  renderTime: number
  memoryUsage?: number
}

class PerformanceMonitor {
  public metrics: Map<string, PerformanceMetrics> = new Map()
  private startTimes: Map<string, number> = new Map()

  // Start timing a page load
  startPageLoad(pageName: string): void {
    this.startTimes.set(`${pageName}_page`, performance.now())
  }

  // End timing a page load
  endPageLoad(pageName: string): void {
    const startTime = this.startTimes.get(`${pageName}_page`)
    if (startTime) {
      const loadTime = performance.now() - startTime
      const existing = this.metrics.get(pageName) || { pageLoad: 0, apiCalls: 0, renderTime: 0 }
      this.metrics.set(pageName, { ...existing, pageLoad: loadTime })
      console.log(`🚀 [Performance] ${pageName} loaded in ${loadTime.toFixed(2)}ms`)
    }
  }

  // Start timing an API call
  startApiCall(apiName: string): string {
    const callId = `${apiName}_${Date.now()}_${Math.random()}`
    this.startTimes.set(callId, performance.now())
    return callId
  }

  // End timing an API call
  endApiCall(callId: string, pageName: string = 'default'): void {
    const startTime = this.startTimes.get(callId)
    if (startTime) {
      const duration = performance.now() - startTime
      const existing = this.metrics.get(pageName) || { pageLoad: 0, apiCalls: 0, renderTime: 0 }
      this.metrics.set(pageName, { 
        ...existing, 
        apiCalls: existing.apiCalls + 1 
      })
      this.startTimes.delete(callId)
      console.log(`📡 [Performance] API call completed in ${duration.toFixed(2)}ms`)
    }
  }

  // Get performance metrics for a page
  getMetrics(pageName: string): PerformanceMetrics | undefined {
    return this.metrics.get(pageName)
  }

  // Get all metrics
  getAllMetrics(): Record<string, PerformanceMetrics> {
    return Object.fromEntries(this.metrics)
  }

  // Clear metrics
  clearMetrics(): void {
    this.metrics.clear()
    this.startTimes.clear()
  }

  // Log performance summary
  logSummary(): void {
    console.log('📊 [Performance Summary]')
    this.metrics.forEach((metrics, pageName) => {
      console.log(`${pageName}:`, {
        loadTime: `${metrics.pageLoad.toFixed(2)}ms`,
        apiCalls: metrics.apiCalls,
        renderTime: `${metrics.renderTime.toFixed(2)}ms`
      })
    })
  }

  // Monitor memory usage (if available)
  getMemoryUsage(): number | undefined {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return memory.usedJSHeapSize / 1024 / 1024 // Convert to MB
    }
    return undefined
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// Hook for monitoring component performance
export const usePerformanceMonitor = (componentName: string) => {
  const startRender = useCallback(() => {
    return performance.now()
  }, [])

  const endRender = useCallback((startTime: number) => {
    const renderTime = performance.now() - startTime
    const existing = performanceMonitor.getMetrics(componentName) || { pageLoad: 0, apiCalls: 0, renderTime: 0 }
    performanceMonitor.metrics.set(componentName, { 
      ...existing, 
      renderTime: existing.renderTime + renderTime 
    })
  }, [componentName])

  return { startRender, endRender }
}

// Note: Higher-order component removed due to TypeScript build errors
// Can be added later when JSX in utility files is properly configured

// API call wrapper for performance monitoring
export const withApiPerformanceMonitoring = async <T>(
  apiCall: () => Promise<T>,
  apiName: string,
  pageName: string = 'default'
): Promise<T> => {
  const callId = performanceMonitor.startApiCall(apiName)
  try {
    const result = await apiCall()
    performanceMonitor.endApiCall(callId, pageName)
    return result
  } catch (error) {
    performanceMonitor.endApiCall(callId, pageName)
    throw error
  }
}
