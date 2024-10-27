import { Parts, PayLoadFileType } from './constant';

abstract class FilterBase {
  constructor() {}

  public abstract filter(event: any): boolean;

  public and(other: FilterBase): FilterBase {
    return new AndFilter(this, other);
  }

  public or(other: FilterBase): FilterBase {
    return new OrFilter(this, other);
  }

  public invert(): FilterBase {
    return new InvertFilter(this);
  }

  public call(event: any): boolean {
    return this.filter(event);
  }
}

class CompositeFilter extends FilterBase {
  protected filter1: FilterBase;
  protected filter2: FilterBase;

  constructor(filter1: FilterBase, filter2: FilterBase) {
    super();
    this.filter1 = filter1;
    this.filter2 = filter2;
  }
}

class AndFilter extends CompositeFilter {
  filter(event: any): boolean {
    return this.filter1.filter(event) && this.filter2.filter(event);
  }
}

class OrFilter extends CompositeFilter {
  filter(event: any): boolean {
    return this.filter1.filter(event) || this.filter2.filter(event);
  }
}

class InvertFilter extends FilterBase {
  private filter_: FilterBase;

  constructor(filter_: FilterBase) {
    super();
    this.filter_ = filter_;
  }

  filter(event: any): boolean {
    return !this.filter_.filter(event);
  }
}

class MessageFilter extends FilterBase {
  filter(event: any): boolean {
    return 'text' in event.data && typeof event.data['text'] === 'string';
  }
}

class CommandFilter extends MessageFilter {
  private static readonly COMMAND_PREFIXES = ['/', '.'];

  filter(event: any): boolean {
    return super.filter(event) && CommandFilter.COMMAND_PREFIXES.some(prefix => event.data['text'].startsWith(prefix));
  }
}

class RegexpFilter extends MessageFilter {
  private pattern: RegExp;

  constructor(pattern: string | RegExp) {
    super();
    this.pattern = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  }

  filter(event: any): boolean {
    return super.filter(event) && this.pattern.test(event.data['text']);
  }
}

class SenderFilter extends MessageFilter {
  private userId: string;

  constructor(userId: string) {
    super();
    this.userId = userId;
  }

  filter(event: any): boolean {
    return super.filter(event) && 'from' in event.data && event.data['from']['userId'] === this.userId;
  }
}

class FileFilter extends MessageFilter {
  filter(event: any): boolean {
    return super.filter(event) && 'parts' in event.data && event.data['parts'].some((p: any) => p['type'] === Parts.FILE);
  }
}

class ImageFilter extends FileFilter {
  filter(event: any): boolean {
    return super.filter(event) && event.data['parts'].some((p: any) => p['payload']?.['type'] === PayLoadFileType.IMAGE);
  }
}

class VideoFilter extends FileFilter {
  filter(event: any): boolean {
    return super.filter(event) && event.data['parts'].some((p: any) => p['payload']?.['type'] === PayLoadFileType.VIDEO);
  }
}

class AudioFilter extends FileFilter {
  filter(event: any): boolean {
    return super.filter(event) && event.data['parts'].some((p: any) => p['payload']?.['type'] === PayLoadFileType.AUDIO);
  }
}

class StickerFilter extends MessageFilter {
  filter(event: any): boolean {
    return super.filter(event) && 'parts' in event.data && event.data['parts'].some((p: any) => p['type'] === Parts.STICKER);
  }
}

class MentionFilter extends MessageFilter {
  private userId?: string;

  constructor(userId?: string) {
    super();
    this.userId = userId;
  }

  filter(event: any): boolean {
    return super.filter(event) && 'parts' in event.data && event.data['parts'].some((p: any) =>
      p['type'] === Parts.MENTION && (this.userId ? p['payload']?.['userId'] === this.userId : true)
    );
  }
}

class ForwardFilter extends MessageFilter {
  filter(event: any): boolean {
    return 'parts' in event.data && event.data['parts'].some((p: any) => p['type'] === Parts.FORWARD);
  }
}

class ReplyFilter extends MessageFilter {
  filter(event: any): boolean {
    return super.filter(event) && 'parts' in event.data && event.data['parts'].some((p: any) => p['type'] === Parts.REPLY);
  }
}

class URLFilter extends RegexpFilter {
  private static readonly REGEXP = /^\s*https?:\/\/\S+\s*$/i;
  private static readonly __FILTER = new InvertFilter(new FileFilter());

  constructor() {
    super(URLFilter.REGEXP);
  }

  filter(event: any): boolean {
    return super.filter(event) && URLFilter.__FILTER.filter(event);
  }
}

class CallbackDataFilter extends FilterBase {
  private callbackData: string;

  constructor(callbackData: string) {
    super();
    this.callbackData = callbackData;
  }

  filter(event: any): boolean {
    return 'callbackData' in event.data && event.data['callbackData'] === this.callbackData;
  }
}

class CallbackDataRegexpFilter extends FilterBase {
  private pattern: RegExp;

  constructor(pattern: string | RegExp) {
    super();
    this.pattern = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  }

  filter(event: any): boolean {
    return 'callbackData' in event.data && this.pattern.test(event.data['callbackData']);
  }
}

// Filter object with instances of all filters
const Filter = {
  message: new MessageFilter(),
  command: new CommandFilter(),
  file: new FileFilter(),
  image: new ImageFilter(),
  video: new VideoFilter(),
  audio: new AudioFilter(),
  media: new OrFilter(new OrFilter(new ImageFilter(), new VideoFilter()), new AudioFilter()),
  data: new AndFilter(new FileFilter(), new InvertFilter(new OrFilter(new OrFilter(new ImageFilter(), new VideoFilter()), new AudioFilter()))),
  sticker: new StickerFilter(),
  url: new URLFilter(),
  text: new AndFilter(new MessageFilter(), new InvertFilter(new OrFilter(new CommandFilter(), new OrFilter(new StickerFilter(), new OrFilter(new FileFilter(), new URLFilter()))))),
  regexp: RegexpFilter,
  mention: MentionFilter,
  forward: new ForwardFilter(),
  reply: new ReplyFilter(),
  sender: SenderFilter,
  callback_data: CallbackDataFilter,
  callback_data_regexp: CallbackDataRegexpFilter,
} as const;

export { FilterBase, Filter, AndFilter, OrFilter, InvertFilter };
