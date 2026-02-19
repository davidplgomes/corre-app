/**
 * Logger Service
 * Comprehensive, verbose, specific, and thorough logging with
 * structured output, context tags, levels, and timestamps.
 * Singleton pattern — use Logger.getInstance().
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

export type LogContext =
    | 'API'
    | 'AUTH'
    | 'STORE'
    | 'NAV'
    | 'SUBSCRIPTION'
    | 'ANALYTICS'
    | 'SUPPORT'
    | 'MARKETING'
    | 'STRIPE'
    | 'DATABASE'
    | 'NETWORK'
    | 'UI'
    | 'LIFECYCLE'
    | 'STORAGE'
    | 'GENERAL';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    context: LogContext;
    message: string;
    data?: unknown;
    error?: Error;
}

class Logger {
    private static instance: Logger;
    private minLevel: LogLevel;
    private buffer: LogEntry[] = [];
    private readonly maxBufferSize = 500;

    private constructor() {
        this.minLevel = __DEV__ ? LogLevel.DEBUG : LogLevel.WARN;
    }

    /** Get singleton instance */
    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    /** Set minimum log level */
    setLevel(level: LogLevel): void {
        this.minLevel = level;
    }

    /** Debug log — verbose development info */
    debug(context: LogContext, message: string, data?: unknown): void {
        this.log(LogLevel.DEBUG, context, message, data);
    }

    /** Info log — significant application events */
    info(context: LogContext, message: string, data?: unknown): void {
        this.log(LogLevel.INFO, context, message, data);
    }

    /** Warning log — potential issues that don't break the app */
    warn(context: LogContext, message: string, data?: unknown): void {
        this.log(LogLevel.WARN, context, message, data);
    }

    /** Error log — failures that need attention */
    error(context: LogContext, message: string, error?: Error | unknown, data?: unknown): void {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        this.log(LogLevel.ERROR, context, message, data, errorObj);
    }

    /** Get buffered log entries (most recent first) */
    getBuffer(): ReadonlyArray<LogEntry> {
        return [...this.buffer].reverse();
    }

    /** Clear log buffer */
    clearBuffer(): void {
        this.buffer = [];
    }

    private log(level: LogLevel, context: LogContext, message: string, data?: unknown, error?: Error): void {
        if (level < this.minLevel) {
            return;
        }

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            context,
            message,
            data,
            error,
        };

        // Buffer management
        this.buffer.push(entry);
        if (this.buffer.length > this.maxBufferSize) {
            this.buffer = this.buffer.slice(-this.maxBufferSize);
        }

        // Console output
        const prefix = `[${entry.timestamp}] [${LogLevel[level]}] [${context}]`;
        const fullMessage = `${prefix} ${message}`;

        switch (level) {
            case LogLevel.DEBUG:
                console.debug(fullMessage, data !== undefined ? data : '');
                break;
            case LogLevel.INFO:
                console.info(fullMessage, data !== undefined ? data : '');
                break;
            case LogLevel.WARN:
                console.warn(fullMessage, data !== undefined ? data : '');
                break;
            case LogLevel.ERROR:
                console.error(fullMessage, error || '', data !== undefined ? data : '');
                break;
        }
    }
}

/** Pre-instantiated logger for convenience */
export const logger = Logger.getInstance();

// Declare the __DEV__ global that React Native provides
declare const __DEV__: boolean;
