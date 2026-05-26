declare module "preact/hooks" {
  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  export function useState<T>(initial: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
  export function useRef<T>(initial: T): { current: T };
  export function useMemo<T>(factory: () => T, deps: unknown[]): T;
}

declare module "preact" {
  type ComponentChildren = any;
  export function h(type: any, props: any, ...children: any[]): any;
  export const Fragment: any;
}

declare module "preact/jsx-runtime" {
  export { Fragment, jsx, jsxs } from "preact";
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
    interface ElementChildrenAttribute {
      children: any;
    }
  }

  interface Event {
    target: EventTarget;
    currentTarget: EventTarget;
    bubbles: boolean;
    cancelable: boolean;
    defaultPrevented: boolean;
    eventPhase: number;
    isTrusted: boolean;
    timeStamp: number;
    type: string;
    preventDefault(): void;
    stopPropagation(): void;
    stopImmediatePropagation(): void;
  }

  interface UIEvent extends Event {
    view: Window;
    detail: number;
  }

  interface MouseEvent extends UIEvent {
    screenX: number;
    screenY: number;
    clientX: number;
    clientY: number;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    metaKey: boolean;
    button: number;
    buttons: number;
    relatedTarget: EventTarget;
  }

  interface KeyboardEvent extends UIEvent {
    key: string;
    code: string;
    location: number;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    metaKey: boolean;
    repeat: boolean;
    charCode: number;
    keyCode: number;
    which: number;
  }

  interface InputEvent extends Event {
    data: string | null;
    inputType: string;
  }

  interface SubmitEvent extends Event {
    submitter: HTMLElement;
  }

  interface MessageEvent<T = any> extends Event {
    data: T;
    origin: string;
    lastEventId: string;
    source: MessageEventSource | null;
    ports: MessagePort[];
  }

  interface HTMLInputElement extends HTMLElement {
    value: string;
    checked: boolean;
    type: string;
    name: string;
    placeholder: string;
    disabled: boolean;
    readOnly: boolean;
    required: boolean;
    accept: string;
    multiple: boolean;
    files: FileList | null;
    selectionStart: number | null;
    selectionEnd: number | null;
    select(): void;
    setSelectionRange(start: number, end: number): void;
  }

  interface HTMLTextAreaElement extends HTMLElement {
    value: string;
    name: string;
    placeholder: string;
    disabled: boolean;
    readOnly: boolean;
    required: boolean;
    rows: number;
    cols: number;
    selectionStart: number | null;
    selectionEnd: number | null;
    select(): void;
    setSelectionRange(start: number, end: number): void;
  }

  interface HTMLSelectElement extends HTMLElement {
    value: string;
    name: string;
    disabled: boolean;
    required: boolean;
    multiple: boolean;
    selectedIndex: number;
    options: HTMLOptionsCollection;
    selectedOptions: HTMLCollectionOf<HTMLOptionElement>;
    add(option: HTMLOptionElement, before?: HTMLElement | number): void;
    remove(index: number): void;
  }

  interface HTMLOptionElement extends HTMLElement {
    value: string;
    text: string;
    index: number;
    selected: boolean;
    disabled: boolean;
  }

  interface HTMLOptionsCollection {
    length: number;
    item(index: number): HTMLOptionElement | null;
    [index: number]: HTMLOptionElement;
  }

  interface HTMLCollectionOf<T extends Element> {
    length: number;
    item(index: number): T | null;
    [index: number]: T;
  }

  interface HTMLButtonElement extends HTMLElement {
    disabled: boolean;
    name: string;
    type: string;
    value: string;
    form: HTMLFormElement;
  }

  interface HTMLFormElement extends HTMLElement {
    elements: HTMLFormControlsCollection;
    length: number;
    name: string;
    method: string;
    target: string;
    action: string;
    submit(): void;
    reset(): void;
  }

  interface HTMLFormControlsCollection extends HTMLCollectionOf<Element> {
    namedItem(name: string): Element | null;
  }

  interface HTMLAnchorElement extends HTMLElement {
    href: string;
    target: string;
    download: string;
    ping: string;
    rel: string;
    referrerPolicy: string;
  }

  interface HTMLIFrameElement extends HTMLElement {
    src: string;
    srcdoc: string;
    name: string;
    sandbox: DOMTokenList;
    contentWindow: Window | null;
    contentDocument: Document | null;
  }

  interface HTMLElement {
    id: string;
    className: string;
    classList: DOMTokenList;
    style: CSSStyleDeclaration;
    dataset: DOMStringMap;
    nonce: string;
    tabIndex: number;
    focus(): void;
    blur(): void;
    click(): void;
    getAttribute(name: string): string | null;
    setAttribute(name: string, value: string): void;
    removeAttribute(name: string): void;
    hasAttribute(name: string): boolean;
    getElementsByTagName(name: string): HTMLCollectionOf<Element>;
    getElementsByClassName(classNames: string): HTMLCollectionOf<Element>;
  }

  interface DOMTokenList {
    length: number;
    item(index: number): string | null;
    contains(token: string): boolean;
    add(...tokens: string[]): void;
    remove(...tokens: string[]): void;
    toggle(token: string, force?: boolean): boolean;
    [index: number]: string;
  }

  interface DOMStringMap {
    [name: string]: string;
  }

  interface CSSStyleDeclaration {
    [name: string]: string;
  }

  interface Window {
    location: Location;
    history: History;
    navigator: Navigator;
    document: Document;
    localStorage: Storage;
    sessionStorage: Storage;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
    setTimeout(handler: () => void, timeout?: number): number;
    setInterval(handler: () => void, timeout?: number): number;
    clearTimeout(id: number): void;
    clearInterval(id: number): void;
    scrollTo(x: number, y: number): void;
    scroll(options: ScrollToOptions): void;
  }

  interface Location {
    href: string;
    protocol: string;
    host: string;
    hostname: string;
    port: string;
    pathname: string;
    search: string;
    hash: string;
    origin: string;
    assign(url: string): void;
    replace(url: string): void;
    reload(): void;
  }

  interface History {
    length: number;
    state: any;
    go(delta?: number): void;
    back(): void;
    forward(): void;
    pushState(state: any, title: string, url?: string): void;
    replaceState(state: any, title: string, url?: string): void;
  }

  interface Navigator {
    userAgent: string;
  }

  interface Document {
    getElementById(id: string): HTMLElement | null;
    getElementsByTagName(name: string): HTMLCollectionOf<Element>;
    getElementsByClassName(classNames: string): HTMLCollectionOf<Element>;
    createElement(tagName: string): HTMLElement;
    querySelector(selectors: string): Element | null;
    querySelectorAll(selectors: string): NodeListOf<Element>;
  }

  interface Storage {
    length: number;
    clear(): void;
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    key(index: number): string | null;
  }

  interface NodeListOf<T extends Node> {
    length: number;
    item(index: number): T | null;
    [index: number]: T;
    forEach(callback: (value: T, index: number, list: NodeListOf<T>) => void): void;
  }

  interface Element extends Node {
    id: string;
    className: string;
    classList: DOMTokenList;
    getAttribute(name: string): string | null;
    setAttribute(name: string, value: string): void;
    removeAttribute(name: string): void;
    hasAttribute(name: string): boolean;
  }

  interface Node {
    nodeType: number;
    nodeName: string;
    childNodes: NodeListOf<ChildNode>;
    parentNode: Node | null;
    parentElement: Element | null;
  }

  interface ChildNode extends Node {
    remove(): void;
  }

  type EventListener = (evt: Event) => void;
  type EventListenerObject = {
    handleEvent(evt: Event): void;
  };

  interface AddEventListenerOptions {
    capture?: boolean;
    once?: boolean;
    passive?: boolean;
  }

  interface EventListenerOptions {
    capture?: boolean;
  }

  interface ScrollToOptions {
    top?: number;
    left?: number;
    behavior?: "auto" | "smooth";
  }

  interface MessageEventSource {
    postMessage(message: any, targetOrigin: string, transfer?: Transferable[]): void;
  }

  interface MessagePort {
    postMessage(message: any, transfer?: Transferable[]): void;
  }
}
