import type { ReplayRecordingData, ReplayRecordingMode } from '@sentry/types';

import type { eventWithTime, recordOptions } from './types/rrweb';

export type RecordingEvent = eventWithTime;
export type RecordingOptions = recordOptions;

export type AllPerformanceEntry = PerformancePaintTiming | PerformanceResourceTiming | PerformanceNavigationTiming;

export interface SendReplayData {
  recordingData: ReplayRecordingData;
  replayId: string;
  segmentId: number;
  includeReplayStartTimestamp: boolean;
  eventContext: PopEventContext;
  timestamp: number;
  session: Session;
  options: ReplayPluginOptions;
}

/**
 * The request payload to worker
 */
export interface WorkerRequest {
  id: number;
  method: string;
  args: unknown[];
}

// PerformancePaintTiming and PerformanceNavigationTiming are only available with TS 4.4 and newer
// Therefore, we're exporting them here to make them available in older TS versions
export type PerformancePaintTiming = PerformanceEntry;
export type PerformanceNavigationTiming = PerformanceEntry & {
  type: string;
  transferSize: number;
  domComplete: number;
};
/**
 * The response from the worker
 */
export interface WorkerResponse {
  id: number;
  method: string;
  success: boolean;
  response: unknown;
}

export type AddEventResult = void;

export interface SampleRates {
  /**
   * The sample rate for session-long replays. 1.0 will record all sessions and
   * 0 will record none.
   */
  sessionSampleRate: number;

  /**
   * The sample rate for sessions that has had an error occur. This is
   * independent of `sessionSampleRate`.
   */
  errorSampleRate: number;
}

/**
 * Session options that are configurable by the integration configuration
 */
export interface SessionOptions extends SampleRates {
  /**
   * If false, will create a new session per pageload. Otherwise, saves session
   * to Session Storage.
   */
  stickySession: boolean;
}

export interface ReplayPluginOptions extends SessionOptions {
  /**
   * The amount of time to wait before sending a replay
   */
  flushMinDelay: number;

  /**
   * The max amount of time to wait before sending a replay
   */
  flushMaxDelay: number;

  /**
   * Attempt to use compression when web workers are available
   *
   * (default is true)
   */
  useCompression: boolean;

  /**
   * Mask all text in recordings. All text will be replaced with asterisks by default.
   */
  maskAllText: boolean;

  /**
   * Block all media (e.g. images, svg, video) in recordings.
   */
  blockAllMedia: boolean;

  /**
   * _experiments allows users to enable experimental or internal features.
   * We don't consider such features as part of the public API and hence we don't guarantee semver for them.
   * Experimental features can be added, changed or removed at any time.
   *
   * Default: undefined
   */
  _experiments: Partial<{
    captureExceptions: boolean;
    traceInternals: boolean;
  }>;
}

export interface ReplayIntegrationPrivacyOptions {
  /**
   * Mask text content for elements that match the CSS selectors in the list.
   */
  mask?: string[];

  /**
   * Unmask text content for elements that match the CSS selectors in the list.
   */
  unmask?: string[];

  /**
   * Block elements that match the CSS selectors in the list. Blocking replaces
   * the element with an empty placeholder with the same dimensions.
   */
  block?: string[];

  /**
   * Unblock elements that match the CSS selectors in the list. This is useful when using `blockAllMedia`.
   */
  unblock?: string[];

  /**
   * Ignore input events for elements that match the CSS selectors in the list.
   */
  ignore?: string[];

  /**
   * A callback function to customize how your text is masked.
   */
  maskFn?: Pick<RecordingOptions, 'maskTextFn'>;
}

// These are optional for ReplayPluginOptions because the plugin sets default values
type OptionalReplayPluginOptions = Partial<ReplayPluginOptions>;

export interface DeprecatedPrivacyOptions {
  /**
   * @deprecated Use `block` which accepts an array of CSS selectors
   */
  blockSelector?: RecordingOptions['blockSelector'];
  /**
   * @deprecated Use `block` which accepts an array of CSS selectors
   */
  blockClass?: RecordingOptions['blockClass'];
  /**
   * @deprecated Use `mask` which accepts an array of CSS selectors
   */
  maskTextClass?: RecordingOptions['maskTextClass'];
  /**
   * @deprecated Use `mask` which accepts an array of CSS selectors
   */
  maskTextSelector?: RecordingOptions['maskTextSelector'];
  /**
   * @deprecated Use `ignore` which accepts an array of CSS selectors
   */
  ignoreClass?: RecordingOptions['ignoreClass'];
}

export interface ReplayConfiguration
  extends ReplayIntegrationPrivacyOptions,
    OptionalReplayPluginOptions,
    DeprecatedPrivacyOptions,
    Pick<RecordingOptions, 'maskAllInputs'> {}

interface CommonEventContext {
  /**
   * The initial URL of the session
   */
  initialUrl: string;

  /**
   * The initial starting timestamp of the session
   */
  initialTimestamp: number;

  /**
   * Ordered list of URLs that have been visited during a replay segment
   */
  urls: string[];
}

export interface PopEventContext extends CommonEventContext {
  /**
   * List of Sentry error ids that have occurred during a replay segment
   */
  errorIds: Array<string>;

  /**
   * List of Sentry trace ids that have occurred during a replay segment
   */
  traceIds: Array<string>;
}

/**
 * Additional context that will be sent w/ `replay_event`
 */
export interface InternalEventContext extends CommonEventContext {
  /**
   * Set of Sentry error ids that have occurred during a replay segment
   */
  errorIds: Set<string>;

  /**
   * Set of Sentry trace ids that have occurred during a replay segment
   */
  traceIds: Set<string>;

  /**
   * The timestamp of the earliest event that has been added to event buffer. This can happen due to the Performance Observer which buffers events.
   */
  earliestEvent: number | null;
}

export type Sampled = false | 'session' | 'error';

export interface Session {
  id: string;

  /**
   * Start time of current session
   */
  started: number;

  /**
   * Last known activity of the session
   */
  lastActivity: number;

  /**
   * Segment ID for replay events
   */
  segmentId: number;

  /**
   * The ID of the previous session.
   * If this is empty, there was no previous session.
   */
  previousSessionId?: string;

  /**
   * Is the session sampled? `false` if not sampled, otherwise, `session` or `error`
   */
  sampled: Sampled;
}

export interface EventBuffer {
  /**
   * The number of raw events that are buffered
   */
  readonly pendingLength: number;

  /**
   * The raw events that are buffered.
   */
  readonly pendingEvents: RecordingEvent[];

  /**
   * Destroy the event buffer.
   */
  destroy(): void;

  /**
   * Add an event to the event buffer.
   *
   * Returns a promise that resolves if the event was successfully added, else rejects.
   */
  addEvent(event: RecordingEvent, isCheckout?: boolean): Promise<AddEventResult>;

  /**
   * Clears and returns the contents of the buffer.
   */
  finish(): Promise<ReplayRecordingData>;
}

export type AddUpdateCallback = () => boolean | void;

export interface ReplayContainer {
  eventBuffer: EventBuffer | null;
  performanceEvents: AllPerformanceEntry[];
  session: Session | undefined;
  recordingMode: ReplayRecordingMode;
  isEnabled(): boolean;
  isPaused(): boolean;
  getContext(): InternalEventContext;
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  startRecording(): void;
  stopRecording(): boolean;
  flushImmediate(): void;
  triggerUserActivity(): void;
  addUpdate(cb: AddUpdateCallback): void;
  getOptions(): ReplayPluginOptions;
  getSessionId(): string | undefined;
  checkAndHandleExpiredSession(): boolean | void;
}

export interface ReplayPerformanceEntry {
  /**
   * One of these types https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEntry/entryType
   */
  type: string;

  /**
   * A more specific description of the performance entry
   */
  name: string;

  /**
   * The start timestamp in seconds
   */
  start: number;

  /**
   * The end timestamp in seconds
   */
  end: number;

  /**
   * Additional unstructured data to be included
   */
  data?: Record<string, unknown>;
}
