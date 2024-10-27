import { StyleType } from './constant';

interface JsonSerializable {
  toJson(): string;
}

interface Dictionaryable {
  toDic(): any;
}

class KeyboardButton implements Dictionaryable, JsonSerializable {
  text: string;
  callbackData?: string;
  style: string;
  url?: string;

  constructor(text: string, style: string = 'primary', callbackData?: string, url?: string) {
    this.text = text;
    this.callbackData = callbackData;
    this.style = style;
    this.url = url;
  }

  toJson(): string {
    return JSON.stringify(this.toDic());
  }

  toDic(): any {
    const jsonDic: any = { text: this.text };
    if (this.callbackData) jsonDic['callbackData'] = this.callbackData;
    if (this.style) jsonDic['style'] = this.style;
    if (this.url) jsonDic['url'] = this.url;
    return jsonDic;
  }
}

class InlineKeyboardMarkup implements Dictionaryable, JsonSerializable {
  buttonsInRow: number;
  keyboard: any[][];

  constructor(buttonsInRow: number = 8) {
    this.buttonsInRow = buttonsInRow;
    this.keyboard = [];
  }

  add(...args: KeyboardButton[]): void {
    let row: any[] = [];
    args.forEach((button, index) => {
      row.push(button.toDic());
      if ((index + 1) % this.buttonsInRow === 0) {
        this.keyboard.push(row);
        row = [];
      }
    });
    if (row.length > 0) this.keyboard.push(row);
  }

  row(...args: KeyboardButton[]): this {
    const btnArray = args.map(button => button.toDic());
    this.keyboard.push(btnArray);
    return this;
  }

  toJson(): string {
    return JSON.stringify(this.keyboard);
  }

  toDic(): any {
    return this.keyboard;
  }
}

class Style implements Dictionaryable, JsonSerializable {
  ranges: any[];

  constructor() {
    this.ranges = [];
  }

  add(offset: number, length: number, args?: any): void {
    const range = { offset, length };
    this.ranges.push(args ? { ...range, ...args } : range);
  }

  toDic(): any {
    return this.ranges;
  }

  toJson(): string {
    return JSON.stringify(this.ranges);
  }
}

class Format implements Dictionaryable, JsonSerializable {
  styles: { [key: string]: Style };

  constructor() {
    this.styles = {};
  }

  add(style: string, offset: number, length: number, args?: any): void {
    StyleType(style); // Ensure style type is valid
    if (this.styles[style]) {
      this.styles[style].add(offset, length, args);
    } else {
      const newStyle = new Style();
      newStyle.add(offset, length, args);
      this.styles[style] = newStyle;
    }
  }

  toDic(): any {
    const result: { [key: string]: any } = {};
    for (const key in this.styles) {
      if (this.styles.hasOwnProperty(key)) {
        result[key] = this.styles[key].toDic();
      }
    }
    return result;
  }

  toJson(): string {
    return JSON.stringify(this.toDic());
  }
}

export {
  KeyboardButton,
  InlineKeyboardMarkup,
  Style,
  Format,
};
