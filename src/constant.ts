enum ImageType {
  REGULAR = "0",
  SNAP = "1",
  STICKER = "2",
  RESERVED_3 = "3",
  IMAGE_ANIMATED = "4",
  STICKER_ANIMATED = "5",
  RESERVED_6 = "6",
  RESERVED_7 = "7"
}

enum VideoType {
  REGULAR = "8",
  SNAP = "9",
  PTS = "A",
  PTS_B = "B",
  RESERVED_C = "C",
  STICKER = "D",
  RESERVED_E = "E",
  RESERVED_F = "F"
}

enum AudioType {
  REGULAR = "G",
  SNAP = "H",
  PTT = "I",
  PTT_J = "J",
  RESERVED_K = "K",
  RESERVED_L = "L",
  RESERVED_M = "M",
  RESERVED_N = "N"
}

enum Parts {
  FILE = "file",
  STICKER = "sticker",
  MENTION = "mention",
  VOICE = "voice",
  FORWARD = "forward",
  REPLY = "reply"
}

enum PayLoadFileType {
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio"
}

enum ChatType {
  PRIVATE = "private",
  GROUP = "group",
  CHANNEL = "channel"
}

enum ParseMode {
  MARKDOWNV2 = "MarkdownV2",
  HTML = "HTML"
}

enum StyleType {
  BOLD = "bold",
  ITALIC = "italic",
  UNDERLINE = "underline",
  STRIKETHROUGH = "strikethrough",
  LINK = "link",
  MENTION = "mention",
  INLINE_CODE = "inline_code",
  PRE = "pre",
  ORDERED_LIST = "ordered_list",
  UNORDERED_LIST = "unordered_list",
  QUOTE = "quote"
}

export {
  ImageType,
  VideoType,
  AudioType,
  Parts,
  PayLoadFileType,
  ChatType,
  ParseMode,
  StyleType,
};
