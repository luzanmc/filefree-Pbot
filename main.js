const fs = require("fs-extra");
const path = require("path");
const chalkAnimation = require('chalkercli');
const chalk = require('chalk');
const gradient = require('gradient-string');
const readlineSync = require('readline-sync');
const logger = require("./pdata/utils/log.js");
const con = require('./config.json');
const moment = require("moment-timezone");
const os = require('os');
const axios = require('axios');

// ====== HỎI VÀ LƯU CẤU HÌNH LỖI ======
const configPath = path.join(__dirname, "config.json");
function askAndSetErrorSaveConfig() {
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    config = {};
  }
  if (typeof config.saveAllErrorToFile === "undefined") {
    const answer = readlineSync.question("Bạn có muốn lưu tất cả lỗi vào file Perror.txt (ẩn lỗi trên màn hình)? (y/n): ");
    config.saveAllErrorToFile = (answer.trim().toLowerCase() === "y");
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
    con.saveAllErrorToFile = config.saveAllErrorToFile;
  }
  return config.saveAllErrorToFile;
}
const SAVE_ERROR_TO_FILE = askAndSetErrorSaveConfig();

// ====== GHI LỖI RA FILE ======
const perrorPath = path.join(__dirname, "Perror.txt");
function saveError(err, section = "Khác") {
  if (!SAVE_ERROR_TO_FILE) return;
  try {
    const time = moment().format('YYYY-MM-DD HH:mm:ss');
    fs.appendFileSync(
      perrorPath,
      `-----[${section}]-----\n[${time}]\n${err && err.stack ? err.stack : err}\n\n`
    );
  } catch (_) {}
}

// ====== SOCKS5 PROXY ======
let agent = undefined, shouldSaveProxy = false;
try {
  if (typeof con.socks5tl === 'undefined' || typeof con.socks5 === 'undefined') {
    const enableProxy = readlineSync.question('Bạn có muốn bật SOCKS5 proxy không? (y/n): ').trim().toLowerCase() === 'y';
    con.socks5tl = enableProxy;
    if (enableProxy) con.socks5 = readlineSync.question('Nhập socks5 proxy dạng socks5://user:pass@host:port : ').trim();
    else con.socks5 = '';
    shouldSaveProxy = true;
  }
  if (shouldSaveProxy) {
    fs.writeFileSync('./config.json', JSON.stringify(con, null, 2), 'utf8');
    logger.loader('Đã lưu cấu hình proxy socks5 vào config.json!');
  }
  if (con.socks5tl && con.socks5 && con.socks5.startsWith('socks5://')) {
    try {
      const { SocksProxyAgent } = require('socks-proxy-agent');
      agent = new SocksProxyAgent(con.socks5);
      (async () => {
        try {
          const res = await axios.get('https://api64.ipify.org?format=text', { httpAgent: agent, httpsAgent: agent, timeout: 7000 });
          logger.loader(`✅ SOCKS5 proxy kết nối thành công! IP ra ngoài: ${res.data}`);
        } catch (e) {
          logger.loader('❌ SOCKS5 proxy KHÔNG kết nối ra ngoài được hoặc sai cấu hình!', 'error');
        }
      })();
    } catch (e) {
      logger.loader('❌ Không thể tải socks-proxy-agent. Hãy cài: npm i socks-proxy-agent', 'error');
      agent = undefined;
    }
  }
} catch (err) { saveError(err, "SOCKS5 Proxy"); }

// ====== THEME ======
let co, error, cra;
try {
  const theme = con.DESIGN?.Theme || 'default';
  switch (theme.toLowerCase()) {
    case 'blue':
      co = gradient([{ color: "#1affa3", pos: 0.2 }, { color: "cyan", pos: 0.4 }, { color: "pink", pos: 0.6 }, { color: "cyan", pos: 0.8 }, { color: '#1affa3', pos: 1 }]);
      error = chalk.red.bold; break;
    case 'dream2':
      cra = gradient("blue", "pink");
      co = gradient("#a200ff", "#21b5ff", "#a200ff"); break;
    case 'dream':
      co = gradient([{ color: "blue", pos: 0.2 }, { color: "pink", pos: 0.3 }, { color: "gold", pos: 0.6 }, { color: "pink", pos: 0.8 }, { color: "blue", pos: 1 }]);
      error = chalk.red.bold; break;
    case 'fiery':
      co = gradient("#fc2803", "#fc6f03", "#fcba03");
      error = chalk.red.bold; break;
    case 'rainbow':
      co = gradient.rainbow;
      error = chalk.red.bold; break;
    case 'pastel':
      co = gradient.pastel;
      error = chalk.red.bold; break;
    case 'red':
      co = gradient("red", "orange");
      error = chalk.red.bold; break;
    case 'aqua':
      co = gradient("#0030ff", "#4e6cf2");
      error = chalk.blueBright; break;
    case 'retro':
      co = gradient.retro;
      break;
    case 'ghost':
      cra = gradient("#0a658a", "#0a7f8a", "#0db5aa");
      co = gradient.mind; break;
    case 'hacker':
      cra = chalk.hex('#4be813');
      co = gradient('#47a127', '#0eed19', '#27f231'); break;
    default:
      co = gradient("#243aff", "#4687f0", "#5800d4");
      error = chalk.red.bold; break;
  }
} catch (err) { saveError(err, "THEME"); }

// ====== CACHE FOLDER ======
try {
  const cacheDir = path.join(__dirname, "pdata", "cache");
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  const restartNotifyPath = path.join(cacheDir, "restart_notify.json");
  setTimeout(() => {
    try {
      if (fs.existsSync(restartNotifyPath)) {
        const notify = JSON.parse(fs.readFileSync(restartNotifyPath, "utf8"));
        const { threadID, senderID } = notify;
        const now = moment.tz("Asia/Ho_Chi_Minh");
        const msg = `✅ [BOT ĐÃ HOẠT ĐỘNG TRỞ LẠI]\n→ Thời gian: ${now.format("HH:mm:ss - DD/MM/YYYY")}\n→ Gửi bởi Admin: https://facebook.com/${senderID}\n→ Uptime: ${Math.floor(process.uptime())} giây`;
        if (global.client && global.client.api && typeof global.client.api.sendMessage === "function") {
          global.client.api.sendMessage(msg, threadID, (err) => { });
        }
        fs.unlinkSync(restartNotifyPath);
      }
    } catch (e) { saveError(e, "RESTART NOTIFY"); }
  }, 5000);
} catch (err) { saveError(err, "CACHE FOLDER"); }

// ====== GLOBALS ======
let listPackage, listbuiltinModules;
try {
  listPackage = JSON.parse(fs.readFileSync('./package.json')).dependencies;
  listbuiltinModules = require("module").builtinModules;
  global.client = {
    commands: new Map(), superBan: new Map(), events: new Map(),
    allThreadID: [], allUsersInfo: new Map(), timeStart: { timeStamp: Date.now(), fullTime: "" },
    allThreadsBanned: new Map(), allUsersBanned: new Map(), cooldowns: new Map(), eventRegistered: [],
    handleSchedule: [], handleReaction: [], handleReply: [], mainPath: process.cwd(), configPath: "",
    getTime: function (option) {
      switch (option) {
        case "seconds": return `${moment.tz("Asia/Ho_Chi_minh").format("ss")}`;
        case "minutes": return `${moment.tz("Asia/Ho_Chi_minh").format("mm")}`;
        case "hours": return `${moment.tz("Asia/Ho_Chi_minh").format("HH")}`;
        case "date": return `${moment.tz("Asia/Ho_Chi_minh").format("DD")}`;
        case "month": return `${moment.tz("Asia/Ho_Chi_minh").format("MM")}`;
        case "year": return `${moment.tz("Asia/Ho_Chi_minh").format("YYYY")}`;
        case "fullHour": return `${moment.tz("Asia/Ho_Chi_minh").format("HH:mm:ss")}`;
        case "fullYear": return `${moment.tz("Asia/Ho_Chi_minh").format("DD/MM/YYYY")}`;
        case "fullTime": return `${moment.tz("Asia/Ho_Chi_minh").format("HH:mm:ss DD/MM/YYYY")}`;
        default: return "";
      }
    }
  };
  global.data = {
    threadInfo: new Map(), threadData: new Map(), userName: new Map(), userBanned: new Map(),
    threadBanned: new Map(), commandBanned: new Map(), threadAllowNSFW: [], allUserID: [],
    allCurrenciesID: [], allThreadID: []
  };
  global.utils = require("./pdata/utils");
  global.nodemodule = {};
  global.config = {};
  global.configModule = {};
  global.moduleData = [];
  global.language = {};
  global.account = {};
  global.anti = path.resolve(process.cwd(), 'anti.json');
} catch (err) { saveError(err, "GLOBALS"); }

// ====== CONFIG LOAD ======
let configValue;
try {
  global.client.configPath = path.join(global.client.mainPath, "config.json");
  configValue = require(global.client.configPath);
} catch (e) {
  logger.loader("Không tìm thấy hoặc lỗi tệp config.json!", "error");
  saveError(e, "CONFIG LOAD");
  return;
}
try {
  for (const key in configValue) global.config[key] = configValue[key];
} catch (err) {
  logger.loader("Lỗi tải tệp config!", "error");
  saveError(err, "CONFIG LOAD");
  return;
}

// (Tiếp theo xử lý login, event, command)
// Ở đây bạn làm tương tự: XÓA tất cả process.exit() và thay bằng return;
// Đồng thời đổi log "Đang tiến hành khởi động lại" thành "Đăng nhập thành công!" hoặc "Có lỗi, vui lòng kiểm tra!"
// ====== LOGIN SECTION ======
(async () => {
  try {
    // Kiểm tra và lấy appstate từ file
    const appstatePath = path.join(__dirname, 'appstate.json');
    let appState = null;

    if (fs.existsSync(appstatePath)) {
      try {
        appState = JSON.parse(fs.readFileSync(appstatePath, 'utf8'));
      } catch (e) {
        logger.loader('❌ Không thể đọc appstate.json. Vui lòng kiểm tra lại!', 'error');
        saveError(e, "APPSTATE LOAD");
        return;
      }
    }

    if (!appState || appState.length === 0) {
      logger.loader('❌ Chưa có Appstate. Vui lòng đăng nhập bằng Email/Pass hoặc Token!', 'warn');

      // Hỏi người dùng chọn phương thức đăng nhập
      const loginChoice = readlineSync.question('Chọn cách đăng nhập (1 = Email/Pass, 2 = Token): ');
      if (loginChoice === '1') {
        const email = readlineSync.question('Nhập Email/UID: ');
        const password = readlineSync.question('Nhập Mật khẩu: ', { hideEchoBack: true });

        const login = require("facebook-chat-api");
        login({ email, password }, (err, api) => {
          if (err) {
            console.log('❌ Đăng nhập thất bại:', err.error || err);
            saveError(err, "LOGIN EMAIL");
            return;
          }
          fs.writeFileSync(appstatePath, JSON.stringify(api.getAppState(), null, 2));
          console.log('✅ Đăng nhập thành công! Đã lưu Appstate.');
          startBot(api);
        });
      } else if (loginChoice === '2') {
        const token = readlineSync.question('Nhập Token: ');
        const login = require("facebook-chat-api");
        login({ accessToken: token }, (err, api) => {
          if (err) {
            console.log('❌ Đăng nhập bằng token thất bại:', err.error || err);
            saveError(err, "LOGIN TOKEN");
            return;
          }
          fs.writeFileSync(appstatePath, JSON.stringify(api.getAppState(), null, 2));
          console.log('✅ Đăng nhập thành công! Đã lưu Appstate.');
          startBot(api);
        });
      } else {
        console.log('❌ Lựa chọn không hợp lệ!');
        return;
      }
    } else {
      // Login bằng Appstate
      const login = require("facebook-chat-api");
      login({ appState }, (err, api) => {
        if (err) {
          console.log('❌ Đăng nhập bằng Appstate thất bại:', err.error || err);
          saveError(err, "LOGIN APPSTATE");
          return;
        }
        console.log('✅ Đăng nhập bằng Appstate thành công!');
        startBot(api);
      });
    }
  } catch (err) {
    saveError(err, "LOGIN SYSTEM");
    console.log('❌ Có lỗi xảy ra khi khởi động bot:', err.message);
    return;
  }
})();

// ====== HÀM KHỞI ĐỘNG BOT ======
function startBot(api) {
  try {
    global.client.api = api;

    api.setOptions({
      listenEvents: true,
      forceLogin: true,
      selfListen: false,
      logLevel: "silent",
      updatePresence: true,
      userAgent: "Mozilla/5.0",
      autoMarkDelivery: true,
      autoMarkRead: false,
      online: true
    });

    console.log('🚀 Bot đã sẵn sàng nhận lệnh!');
    listen(api);
  } catch (err) {
    saveError(err, "START BOT");
    console.log('❌ Lỗi khi khởi động bot:', err.message);
    return;
  }
}

// ====== HÀM NGHE SỰ KIỆN ======
function listen(api) {
  api.listenMqtt((err, event) => {
    if (err) {
      saveError(err, "LISTEN ERROR");
      console.log('❌ Lỗi khi lắng nghe sự kiện:', err.message);
      return;
    }

    switch (event.type) {
      case "message":
        console.log(`[MSG] ${event.senderID}: ${event.body}`);
        break;
      case "event":
        console.log(`[EVENT] ${event.logMessageType}`);
        break;
      default:
        break;
    }
  });
}
