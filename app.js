// ====== Google API 設定 ======
const CLIENT_ID = '37823403561-e1ng2rda4doi2np86fmaidn0afl2cpnq.apps.googleusercontent.com';
const API_KEY = 'AIzaSyD_hh82gKjAFmrIVKT1nlD2-vQpKzWtH_c';
const PROJECT_NUMBER = '37823403561';

// Picker読込およびGoogleドライブへのファイル書き込みスコープ
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file';

let tokenClient;
let accessToken = null;
let pickerInited = false;
let gisInited = false;

// 簡易年代別ニュース辞書
const historicalNews = {
  1964: "東京オリンピック開催、東海道新幹線開業",
  1968: "3億円事件発生",
  1969: "アポロ11号月面着陸",
  1970: "日本万国博覧会（大阪万博）開催",
  1972: "日中国交正常化、札幌冬季五輪、あさま山荘事件",
  1973: "第1次オイルショック",
  1976: "ロッキード事件",
  1979: "インベーダーゲーム大ブーム",
  1983: "東京ディズニーランド開園、任天堂ファミコン発売",
  1985: "日本航空123便事故、つくば科学万博",
  1986: "バブル経済期へ突入、チェルノブイリ原発事故",
  1989: "昭和から平成へ（1月8日改元）、消費税導入（3%）、東西冷戦終結",
  1990: "東西ドイツ統一",
  1991: "バブル崩壊、湾岸戦争",
  1993: "Jリーグ開幕",
  1995: "阪神・淡路大震災、地下鉄サリン事件、Windows 95発売",
  1997: "消費税5%に引き上げ",
  1998: "長野冬季オリンピック開催",
  2000: "2000年問題、シドニー五輪",
  2001: "アメリカ同時多発テロ事件（9.11）",
  2002: "日韓ワールドカップ共催",
  2008: "リーマン・ショック",
  2011: "東日本大震災（3.11）",
  2014: "消費税8%に引き上げ",
  2019: "平成から令和へ（5月1日改元）、消費税10%に引き上げ",
  2020: "新型コロナウイルス世界的流行、東京五輪延期",
  2021: "東京2020オリンピック・パラリンピック開催",
  2022: "ロシアによるウクライナ侵攻",
  2024: "能登半島地震",
  2025: "大阪・関西万博開催"
};

// DOM要素
const userNameInput = document.getElementById("userName");
const birthDateInput = document.getElementById("birthDate");
const generateBtn = document.getElementById("generateBtn");
const initImportCsvBtn = document.getElementById("initImportCsvBtn");
const photoSection = document.getElementById("photoSection");
const actionBar = document.getElementById("actionBar");
const tableSection = document.getElementById("tableSection");
const tableBody = document.getElementById("tableBody");
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const photoResult = document.getElementById("photoResult");
const saveBtn = document.getElementById("saveBtn");
const importCsvBtn = document.getElementById("importCsvBtn");
const csvFileInput = document.getElementById("csvFileInput");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const driveBackupBtn = document.getElementById("driveBackupBtn");
const clearBtn = document.getElementById("clearBtn");
const googlePhotosBtn = document.getElementById("googlePhotosBtn");

const CURRENT_YEAR = new Date().getFullYear();

// 初期化（ローカルストレージ復元とAPI初期化）
window.addEventListener("DOMContentLoaded", () => {
  const savedData = localStorage.getItem("my_chronicle_data");
  if (savedData) {
    try {
      const data = JSON.parse(savedData);
      userNameInput.value = data.name || "";
      birthDateInput.value = data.birthDate || "";
      if (data.records && data.records.length > 0) {
        renderTable(data.birthDate, data.records);
      }
    } catch (e) {
      console.error("データ復元エラー:", e);
    }
  }

  const checkGoogleLoaded = setInterval(() => {
    if (window.google && window.gapi) {
      clearInterval(checkGoogleLoaded);
      initGoogleApis();
    }
  }, 100);
});

function initGoogleApis() {
  gapi.load('picker', () => {
    pickerInited = true;
  });

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: '',
  });
  gisInited = true;
}

// 認証トークン取得ヘルパー
function getAccessToken(callback) {
  if (!gisInited) {
    alert("Google APIを読み込み中です。数秒待ってから再試行してください。");
    return;
  }
  tokenClient.callback = async (response) => {
    if (response.error !== undefined) {
      console.error("Auth error:", response);
      alert("認証エラーが発生しました: " + response.error);
      return;
    }
    accessToken = response.access_token;
    callback(accessToken);
  };
  tokenClient.requestAccessToken({ prompt: '' });
}

// Googleフォト選択ボタン
googlePhotosBtn.addEventListener("click", () => {
  if (!pickerInited) {
    alert("Google APIを読み込み中です。数秒待ってから再試行してください。");
    return;
  }
  getAccessToken(() => {
    try {
      createPicker();
    } catch (err) {
      console.error("Picker creation error:", err);
      alert("ピッカーの起動に失敗しました。");
    }
  });
});

// Google Picker ダイアログの生成
function createPicker() {
  const view = new google.picker.DocsView(google.picker.ViewId.DOCS_IMAGES)
    .setMimeTypes("image/png,image/jpeg,image/jpg,image/webp");

  const picker = new google.picker.PickerBuilder()
    .enableFeature(google.picker.Feature.NAV_HIDDEN)
    .setAppId(PROJECT_NUMBER)
    .setOrigin(window.location.protocol + '//' + window.location.host)
    .setOAuthToken(accessToken)
    .addView(view)
    .setDeveloperKey(API_KEY)
    .setCallback(pickerCallback)
    .build();
  picker.setVisible(true);
}

// Pickerで写真が選択された時の処理
function pickerCallback(data) {
  if (data.action === google.picker.Action.PICKED) {
    const doc = data.docs[0];
    const timestamp = doc.uploadDate || doc.date || (doc.lastEditedUtc ? parseInt(doc.lastEditedUtc, 10) : null);
    if (timestamp) {
      const dt = new Date(parseInt(timestamp, 10));
      const photoYear = dt.getFullYear();
      const dateStr = `${photoYear}年${dt.getMonth() + 1}月${dt.getDate()}日`;

      photoResult.style.display = "block";
      photoResult.innerHTML = `<strong>Googleフォトから選択:</strong> ${dateStr} の写真を検出しました。<br>該当行へスクロールしました。「旅行・イベント」列に入力してください。`;

      highlightAndScrollToYear(photoYear);
    } else {
      photoResult.style.display = "block";
      photoResult.textContent = "写真の日時情報を取得できませんでした。";
    }
  }
}

// 該当年のハイライトとスクロール
function highlightAndScrollToYear(photoYear) {
  const targetRow = document.getElementById(`row-${photoYear}`);
  if (targetRow) {
    document.querySelectorAll("tr.highlight-row").forEach(r => r.classList.remove("highlight-row"));
    targetRow.classList.add("highlight-row");
    targetRow.scrollIntoView({ behavior: "smooth", block: "center" });

    const eventCell = targetRow.querySelector(".col-events");
    if (eventCell && eventCell.textContent.trim() === "") {
      eventCell.focus();
    }
  } else {
    photoResult.innerHTML += `<br>※年表の範囲外（${photoYear}年）の写真です。`;
  }
}

// 年表生成ボタン
generateBtn.addEventListener("click", () => {
  const birthVal = birthDateInput.value;
  if (!birthVal) {
    alert("生年月日を入力してください。");
    return;
  }
  renderTable(birthVal);
});

// テーブル描画
function renderTable(birthVal, savedRecords = null) {
  const birth = new Date(birthVal);
  const birthYear = birth.getFullYear();
  const birthMonth = birth.getMonth() + 1;
  const birthDay = birth.getDate();

  tableBody.innerHTML = "";

  const recordsMap = {};
  if (savedRecords) {
    savedRecords.forEach(r => {
      recordsMap[r.year] = r;
    });
  }

  for (let year = birthYear; year <= CURRENT_YEAR; year++) {
    const age = year - birthYear;
    const tr = document.createElement("tr");
    tr.id = `row-${year}`;

    let autoCareer = "";
    const isEarly = (birthMonth < 4) || (birthMonth === 4 && birthDay === 1);
    const schoolStartYear = birthYear + (isEarly ? 6 : 7);

    if (year === schoolStartYear) autoCareer = "小学校 入学";
    else if (year === schoolStartYear + 6) autoCareer = "小学校 卒業 / 中学校 入学";
    else if (year === schoolStartYear + 9) autoCareer = "中学校 卒業 / 高校 入学";
    else if (year === schoolStartYear + 12) autoCareer = "高校 卒業 / 大学 入学";
    else if (year === schoolStartYear + 16) autoCareer = "大学 卒業 / 就職";

    const saved = recordsMap[year] || {};
    const careerText = saved.career !== undefined ? saved.career : autoCareer;
    const eventsText = saved.events !== undefined ? saved.events : "";
    const newsText = saved.news !== undefined ? saved.news : (historicalNews[year] || "");

    tr.innerHTML = `
      <td class="col-year">${year}</td>
      <td class="col-age">${age}歳</td>
      <td class="col-career editable" contenteditable="true">${careerText}</td>
      <td class="col-events editable" contenteditable="true">${eventsText}</td>
      <td class="col-news editable" contenteditable="true">${newsText}</td>
    `;
    tableBody.appendChild(tr);
  }

  photoSection.style.display = "block";
  actionBar.style.display = "flex";
  tableSection.style.display = "block";
}

// 写真ローカルドロップ処理
dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  if (e.dataTransfer.files.length > 0) {
    handleLocalPhoto(e.dataTransfer.files[0]);
  }
});
fileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) {
    handleLocalPhoto(e.target.files[0]);
  }
});

async function handleLocalPhoto(file) {
  try {
    const exifData = await exifr.parse(file);
    if (exifData && exifData.DateTimeOriginal) {
      const dt = new Date(exifData.DateTimeOriginal);
      const photoYear = dt.getFullYear();
      const dateStr = `${photoYear}年${dt.getMonth() + 1}月${dt.getDate()}日`;

      photoResult.style.display = "block";
      photoResult.innerHTML = `<strong>撮影日時を検出:</strong> ${dateStr} の写真です。<br>該当行へスクロールしました。「旅行・イベント」列に入力してください。`;

      highlightAndScrollToYear(photoYear);
    } else {
      photoResult.style.display = "block";
      photoResult.textContent = "写真から撮影日時（Exif）を取得できませんでした。";
    }
  } catch (err) {
    console.error("Exif解析エラー:", err);
    photoResult.style.display = "block";
    photoResult.textContent = "画像ファイルの解析に失敗しました。";
  }
}

// 一時保存
saveBtn.addEventListener("click", () => {
  saveToLocalStorage();
  alert("ブラウザに一時保存しました。");
});

function saveToLocalStorage() {
  const records = extractTableData();
  const data = {
    name: userNameInput.value,
    birthDate: birthDateInput.value,
    records: records
  };
  localStorage.setItem("my_chronicle_data", JSON.stringify(data));
}

// CSV出力文字列の生成
function generateCsvContent() {
  const records = extractTableData();
  let csv = "\uFEFF西暦,年齢,学歴・職歴,旅行・イベント,日本・海外のニュース\n";
  records.forEach(r => {
    const row = [
      `"${r.year}"`,
      `"${r.age}"`,
      `"${r.career.replace(/"/g, '""')}"`,
      `"${r.events.replace(/"/g, '""')}"`,
      `"${r.news.replace(/"/g, '""')}"`
    ];
    csv += row.join(",") + "\n";
  });
  return csv;
}

// ローカルCSVダウンロード
exportCsvBtn.addEventListener("click", () => {
  const csv = generateCsvContent();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `my-chronicle_${userNameInput.value || "履歴"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// CSVインポート（読込）
importCsvBtn.addEventListener("click", () => csvFileInput.click());
if (initImportCsvBtn) {
  initImportCsvBtn.addEventListener("click", () => csvFileInput.click()); // ← この行を追加
}
csvFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const text = event.target.result;
    parseAndApplyCsv(text);
    csvFileInput.value = "";
  };
  reader.readAsText(file, "UTF-8");
});

function parseAndApplyCsv(csvText) {
  const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== "");
  if (lines.length < 2) {
    alert("有効なCSVデータではありません。");
    return;
  }

  // 1行目はヘッダーとしてスキップ
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    // 簡易CSVパース（ダブルクォート対応）
    const match = lines[i].match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
    if (!match || match.length < 5) continue;

    const row = match.map(val => {
      let v = val.replace(/^,/, '').trim();
      if (v.startsWith('"') && v.endsWith('"')) {
        v = v.substring(1, v.length - 1).replace(/""/g, '"');
      }
      return v;
    });

    records.push({
      year: parseInt(row[0], 10),
      age: row[1],
      career: row[2],
      events: row[3],
      news: row[4]
    });
  }

  if (records.length === 0 || isNaN(records[0].year)) {
    alert("年表データの抽出に失敗しました。");
    return;
  }

  // 生年特定と再描画
  const firstYear = records[0].year;
  let birthVal = birthDateInput.value;
  if (!birthVal) {
    birthVal = `${firstYear}-01-01`;
    birthDateInput.value = birthVal;
  }

  renderTable(birthVal, records);
  saveToLocalStorage();
  alert("CSVから年表データを復元しました。");
}

// ====== Google ドライブ自動バックアップ連携 ======
driveBackupBtn.addEventListener("click", () => {
  const records = extractTableData();
  if (records.length === 0) {
    alert("保存する年表データがありません。");
    return;
  }

  getAccessToken(async (token) => {
    driveBackupBtn.disabled = true;
    driveBackupBtn.textContent = "☁️ ドライブ保存中...";

    try {
      // 1. "90_Tools" フォルダを検索、なければ新規作成
      const folderId = await getOrCreateToolsFolder(token);

      // 2. ファイル名設定: mychronicle_yyyymmdd.csv
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const fileName = `mychronicle_${yyyy}${mm}${dd}.csv`;

      // 3. CSVデータをアップロード
      const csvContent = generateCsvContent();
      await uploadCsvToDrive(token, folderId, fileName, csvContent);

      alert(`Googleドライブへ保存しました:\nマイドライブ/90_Tools/${fileName}`);
    } catch (err) {
      console.error("Drive backup error:", err);
      alert("ドライブ保存に失敗しました: " + (err.message || err));
    } finally {
      driveBackupBtn.disabled = false;
      driveBackupBtn.textContent = "☁️ ドライブ保存";
    }
  });
});

// "90_Tools" フォルダのID取得または作成
async function getOrCreateToolsFolder(token) {
  const query = "name = '90_Tools' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and 'root' in parents";
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;

  const res = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();

  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // なければ新規作成
  const createUrl = 'https://www.googleapis.com/drive/v3/files';
  const meta = {
    name: '90_Tools',
    mimeType: 'application/vnd.google-apps.folder',
    parents: ['root']
  };

  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(meta)
  });
  const newFolder = await createRes.json();
  return newFolder.id;
}

// Multipartアップロードで指定フォルダにCSVを保存
async function uploadCsvToDrive(token, folderId, fileName, csvContent) {
  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: 'text/csv'
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/csv; charset=UTF-8\r\n\r\n' +
    csvContent +
    closeDelimiter;

  const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });

  if (!res.ok) {
    const errorJson = await res.json();
    throw new Error(errorJson.error?.message || "Upload failed");
  }
}

// リセット
clearBtn.addEventListener("click", () => {
  if (confirm("入力した内容をすべてクリアしますか？")) {
    localStorage.removeItem("my_chronicle_data");
    location.reload();
  }
});

function extractTableData() {
  const rows = tableBody.querySelectorAll("tr");
  const data = [];
  rows.forEach(tr => {
    data.push({
      year: tr.querySelector(".col-year").textContent.trim(),
      age: tr.querySelector(".col-age").textContent.trim(),
      career: tr.querySelector(".col-career").textContent.trim(),
      events: tr.querySelector(".col-events").textContent.trim(),
      news: tr.querySelector(".col-news").textContent.trim()
    });
  });
  return data;
}
