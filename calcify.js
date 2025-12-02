/*
  Calcify - Kalkulator Web Modern
  Aplikasi kalkulator vanilla JavaScript dengan dukungan penuh keyboard,
  manajemen riwayat, dan validasi input yang ketat.
  
  Semua komentar dalam bahasa Indonesia sesuai persyaratan.
*/

// ============================================================================
// KONFIGURASI DAN KONSTANTA GLOBAL
// ============================================================================

const CONFIG = {
  WELCOME_DURATION: 1000, // Durasi welcome screen sebelum fade out (ms)
  HISTORY_STORAGE_KEY: "calcify_history", // Key untuk localStorage
  MAX_HISTORY_ITEMS: 50, // Batas maksimum item riwayat
  MAX_DISPLAY_LENGTH: 18, // Jumlah karakter maksimal untuk display
};

// Operator yang disupport: simbol asli dipetakan ke simbol display
const OPERATORS = {
  "+": "+",
  "-": "−", // Unicode minus sign untuk clarity
  "*": "×",
  "/": "÷",
  "%": "%",
};

// ============================================================================
// STATE MANAGEMENT - Manajemen status kalkulator
// ============================================================================

let calculatorState = {
  // Display saat ini
  displayValue: "0",
  expression: "",

  // Operand dan operator untuk parsing
  operand1: null,
  operand2: null,
  currentOperator: null,

  // Flag status
  isError: false,
  justEvaluated: false, // Flag untuk tahu apakah baru saja dihitung
  lastWasOperator: false, // Flag untuk validasi input

  // Riwayat perhitungan
  history: [],
};

// ============================================================================
// INISIALISASI APLIKASI
// ============================================================================

document.addEventListener("DOMContentLoaded", function () {
  // Muat riwayat dari localStorage
  loadHistoryFromStorage();

  // Tampilkan welcome screen dan fade out setelah durasi
  setTimeout(() => {
    hideWelcomeScreen();
  }, CONFIG.WELCOME_DURATION);

  // Setup event listeners
  setupEventListeners();

  // Update display awal
  updateDisplay();
});

// ============================================================================
// SETUP EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
  // Event listener untuk tombol kalkulator
  document.querySelectorAll(".key").forEach((button) => {
    button.addEventListener("click", handleButtonClick);
  });

  // Event listener untuk toggle history panel
  document
    .getElementById("historyToggle")
    .addEventListener("click", toggleHistoryPanel);

  // Event listener untuk keyboard input
  document.addEventListener("keydown", handleKeyboardInput);
}

// ============================================================================
// WELCOME SCREEN - Animasi fade-out welcome screen
// ============================================================================

function hideWelcomeScreen() {
  const welcomeScreen = document.getElementById("welcomeScreen");
  welcomeScreen.classList.add("hidden");
}

// ============================================================================
// BUTTON EVENT HANDLER - Menangani klik tombol kalkulator
// ============================================================================

function handleButtonClick(event) {
  const button = event.currentTarget;

  // Tangani tombol digit
  if (button.dataset.digit !== undefined) {
    inputDigit(button.dataset.digit);
    button.focus();
    return;
  }

  // Tangani tombol operator
  if (button.dataset.operator !== undefined) {
    inputOperator(button.dataset.operator);
    button.focus();
    return;
  }

  // Tangani tombol aksi (C, DEL, =)
  const action = button.dataset.action;
  if (action === "clear") {
    clearCalculator();
  } else if (action === "delete") {
    deleteLastCharacter();
  }

  // Tangani tombol equals
  if (button.classList.contains("key-equals")) {
    evaluateExpression();
  }

  button.focus();
}

// ============================================================================
// KEYBOARD INPUT HANDLER - Mendukung input dari keyboard fisik
// ============================================================================

function handleKeyboardInput(event) {
  // Jangan tangani jika user sedang mengetik di input lain
  if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
    return;
  }

  const key = event.key;

  // Digit 0-9
  if (/^\d$/.test(key)) {
    event.preventDefault();
    inputDigit(key);
    return;
  }

  // Decimal point
  if (key === ".") {
    event.preventDefault();
    inputDigit(".");
    return;
  }

  // Operator: + - * / %
  if (key === "+") {
    event.preventDefault();
    inputOperator("+");
    return;
  }
  if (key === "-") {
    event.preventDefault();
    inputOperator("−"); // Konversi ke minus sign unicode
    return;
  }
  if (key === "*") {
    event.preventDefault();
    inputOperator("×"); // Konversi ke multiply sign unicode
    return;
  }
  if (key === "/") {
    event.preventDefault();
    inputOperator("/"); // Gunakan karakter asli, normalizeOperator akan konversi
    return;
  }
  if (key === "%") {
    event.preventDefault();
    inputOperator("%");
    return;
  }

  // Enter atau = untuk evaluasi
  if (key === "Enter" || key === "=") {
    event.preventDefault();
    evaluateExpression();
    return;
  }

  // Backspace untuk delete
  if (key === "Backspace") {
    event.preventDefault();
    deleteLastCharacter();
    return;
  }

  // Escape atau C untuk clear
  if (key === "Escape" || key.toLowerCase() === "c") {
    event.preventDefault();
    clearCalculator();
    return;
  }
}

// ============================================================================
// INPUT HANDLERS - Fungsi untuk menangani input pengguna
// ============================================================================

/*
  inputDigit(digit) - Menambahkan digit atau decimal point ke display
  
  Logika:
  - Jika Error ada, C akan clear terlebih dahulu
  - Jika displayValue === '0', digit baru akan mengganti (kecuali decimal)
  - Jika habis evaluasi (justEvaluated), reset untuk input baru
  - Validasi decimal: hanya satu per token
  - Validasi panjang display untuk mencegah overflow
*/
function inputDigit(digit) {
  // Jika ada error, mulai fresh
  if (calculatorState.isError) {
    clearCalculator();
  }

  // Jika baru saja evaluasi, mulai expression baru
  if (calculatorState.justEvaluated) {
    if (digit === ".") {
      calculatorState.displayValue = "0.";
    } else {
      calculatorState.displayValue = digit;
    }
    calculatorState.expression = digit;
    calculatorState.justEvaluated = false;
    calculatorState.lastWasOperator = false;
    updateDisplay();
    return;
  }

  // Validasi decimal point
  if (digit === ".") {
    // Cek apakah sudah ada decimal dalam token saat ini
    const lastOperatorIndex = Math.max(
      calculatorState.expression.lastIndexOf("+"),
      calculatorState.expression.lastIndexOf("−"),
      calculatorState.expression.lastIndexOf("×"),
      calculatorState.expression.lastIndexOf("÷"),
      calculatorState.expression.lastIndexOf("%")
    );

    const currentToken = calculatorState.expression.substring(
      lastOperatorIndex + 1
    );

    // Jika sudah ada decimal, jangan tambah
    if (currentToken.includes(".")) {
      return;
    }

    // Jika expression kosong atau baru saja ada operator
    if (calculatorState.lastWasOperator || calculatorState.expression === "") {
      calculatorState.displayValue = "0.";
      calculatorState.expression += "0.";
      updateDisplay();
      return;
    }
  }

  // Validasi panjang display
  if (calculatorState.displayValue.length >= CONFIG.MAX_DISPLAY_LENGTH) {
    return;
  }

  // Jika display adalah '0' dan input bukan '.', ganti display
  if (calculatorState.displayValue === "0" && digit !== ".") {
    calculatorState.displayValue = digit;
    calculatorState.expression =
      calculatorState.expression.slice(0, -1) + digit;
  } else {
    // Tambah ke display
    calculatorState.displayValue += digit;
    calculatorState.expression += digit;
  }

  calculatorState.lastWasOperator = false;
  updateDisplay();
}

/*
  inputOperator(operator) - Menambahkan operator ke expression
  
  Logika:
  - Jika ada error, clear dulu
  - Jika dua operator berturut-turut, ganti operator terakhir
  - Jika baru evaluasi, gunakan result sebagai operand1
  - Validasi untuk mencegah invalid state
*/
function inputOperator(operator) {
  // Jika ada error, mulai fresh
  if (calculatorState.isError) {
    clearCalculator();
  }

  // Jika expression kosong, tidak bisa mulai dengan operator
  if (calculatorState.expression === "") {
    return;
  }

  // Konversi operator symbols untuk consistency dalam expression
  const normalizedOperator = normalizeOperator(operator);

  // Jika dua operator berturut-turut, ganti operator terakhir
  if (calculatorState.lastWasOperator) {
    calculatorState.expression =
      calculatorState.expression.slice(0, -1) + normalizedOperator;
    calculatorState.displayValue = normalizedOperator;
    updateDisplay();
    return;
  }

  // Jika baru saja evaluasi, gunakan result sebagai operand1
  if (calculatorState.justEvaluated) {
    calculatorState.expression =
      calculatorState.displayValue + normalizedOperator;
    calculatorState.justEvaluated = false;
  } else {
    // Tambah operator ke expression
    calculatorState.expression += normalizedOperator;
  }

  calculatorState.displayValue = normalizedOperator;
  calculatorState.lastWasOperator = true;
  updateDisplay();
}

/*
  deleteLastCharacter() - Menghapus karakter terakhir dari expression
  
  Logika:
  - Hapus karakter terakhir dari expression
  - Update displayValue berdasarkan token terakhir
  - Validasi state untuk consistency
*/
function deleteLastCharacter() {
  // Jika ada error, clear semua
  if (calculatorState.isError) {
    clearCalculator();
    return;
  }

  if (calculatorState.expression.length === 0) {
    return;
  }

  calculatorState.expression = calculatorState.expression.slice(0, -1);

  // Tentukan displayValue berdasarkan token terakhir
  if (calculatorState.expression === "") {
    calculatorState.displayValue = "0";
    calculatorState.lastWasOperator = false;
  } else {
    const lastChar =
      calculatorState.expression[calculatorState.expression.length - 1];

    // Jika karakter terakhir adalah operator
    if (isOperatorSymbol(lastChar)) {
      calculatorState.displayValue = lastChar;
      calculatorState.lastWasOperator = true;
    } else {
      // Hitung token terakhir (angka saja)
      const lastOperatorIndex = Math.max(
        calculatorState.expression.lastIndexOf("+"),
        calculatorState.expression.lastIndexOf("−"),
        calculatorState.expression.lastIndexOf("×"),
        calculatorState.expression.lastIndexOf("÷"),
        calculatorState.expression.lastIndexOf("%")
      );

      calculatorState.displayValue =
        calculatorState.expression.substring(lastOperatorIndex + 1) || "0";
      calculatorState.lastWasOperator = false;
    }
  }

  updateDisplay();
}

/*
  clearCalculator() - Reset seluruh state kalkulator
  Digunakan ketika C ditekan atau ada error yang perlu di-clear
*/
function clearCalculator() {
  calculatorState = {
    displayValue: "0",
    expression: "",
    operand1: null,
    operand2: null,
    currentOperator: null,
    isError: false,
    justEvaluated: false,
    lastWasOperator: false,
    history: calculatorState.history, // Pertahankan history
  };
  updateDisplay();
}

// ============================================================================
// EXPRESSION EVALUATION - Evaluasi expression dengan operator precedence
// ============================================================================

/*
  evaluateExpression() - Evaluasi expression saat ini dan hitung hasilnya
  
  Pendekatan: Shunting-yard algorithm untuk menangani operator precedence
  - Tokenize expression
  - Validasi structure
  - Terapkan operator precedence (%, perkalian/pembagian, penjumlahan/pengurangan)
  - Hitung hasil
  - Simpan ke history jika valid
  
  Operator precedence (dari tertinggi ke terendah):
  1. % (modulo)
  2. * / (perkalian, pembagian)
  3. + - (penjumlahan, pengurangan)
*/
function evaluateExpression() {
  // Jika expression kosong atau hanya ada satu number, tidak ada yang dievaluasi
  if (calculatorState.expression === "" || calculatorState.lastWasOperator) {
    return;
  }

  try {
    // Tokenize expression
    const tokens = tokenizeExpression(calculatorState.expression);

    // Validasi tokens
    if (!validateTokens(tokens)) {
      setError();
      return;
    }

    // Evaluasi menggunakan recursive descent parsing
    const result = evaluateTokens(tokens);

    // Cek hasil valid
    if (result === null || !isFinite(result)) {
      setError();
      return;
    }

    // Format result untuk display
    const displayResult = formatNumber(result);

    // Simpan ke history
    addToHistory(calculatorState.expression, displayResult);

    // Update state
    calculatorState.displayValue = displayResult;
    calculatorState.expression = displayResult;
    calculatorState.justEvaluated = true;
    calculatorState.lastWasOperator = false;
    calculatorState.isError = false;

    updateDisplay();
  } catch (error) {
    // Tangkap error apapun dalam evaluasi
    setError();
  }
}

/*
  tokenizeExpression(expr) - Memecah expression string menjadi tokens
  
  Contoh: "12.5+3×4−2÷2" menjadi ["12.5", "+", "3", "×", "4", "−", "2", "÷", "2"]
*/
function tokenizeExpression(expr) {
  const tokens = [];
  let currentNumber = "";

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];

    if (isOperatorSymbol(char)) {
      if (currentNumber) {
        tokens.push(currentNumber);
        currentNumber = "";
      }
      tokens.push(char);
    } else {
      currentNumber += char;
    }
  }

  if (currentNumber) {
    tokens.push(currentNumber);
  }

  return tokens;
}

/*
  validateTokens(tokens) - Validasi struktur token
  
  Aturan valid:
  - Harus dimulai dengan number
  - Harus berakhir dengan number
  - Tidak boleh ada dua operator berturut-turut
  - Setiap number valid (bukan NaN)
*/
function validateTokens(tokens) {
  if (tokens.length === 0) return false;

  // Harus dimulai dengan number
  if (isOperatorSymbol(tokens[0])) return false;

  // Harus berakhir dengan number
  if (isOperatorSymbol(tokens[tokens.length - 1])) return false;

  // Validasi alternasi number-operator-number
  for (let i = 0; i < tokens.length; i++) {
    const isOperator = isOperatorSymbol(tokens[i]);
    const shouldBeOperator = i % 2 === 1;

    if (isOperator !== shouldBeOperator) return false;

    // Validasi number tokens
    if (!isOperator && isNaN(parseFloat(tokens[i]))) return false;
  }

  return true;
}

/*
  evaluateTokens(tokens) - Evaluasi tokens dengan operator precedence
  
  Algoritma:
  1. Scan untuk % operator, evaluasi dari kiri ke kanan
  2. Scan untuk * dan /, evaluasi dari kiri ke kanan
  3. Scan untuk + dan -, evaluasi dari kiri ke kanan
  
  Ini memastikan operator precedence yang benar.
*/
function evaluateTokens(tokens) {
  // Buat copy tokens untuk memanipulasi
  let workingTokens = [...tokens];

  // Pass 1: Handle % (modulo)
  for (let i = 1; i < workingTokens.length; i += 2) {
    if (workingTokens[i] === "%") {
      const left = parseFloat(workingTokens[i - 1]);
      const right = parseFloat(workingTokens[i + 1]);
      const result = left % right;
      workingTokens.splice(i - 1, 3, result.toString());
      i -= 2;
    }
  }

  // Pass 2: Handle * dan ÷
  for (let i = 1; i < workingTokens.length; i += 2) {
    if (workingTokens[i] === "×" || workingTokens[i] === "÷") {
      const left = parseFloat(workingTokens[i - 1]);
      const right = parseFloat(workingTokens[i + 1]);

      // Validasi pembagian dengan nol
      if (workingTokens[i] === "÷" && right === 0) {
        throw new Error("Division by zero");
      }

      const operator = workingTokens[i] === "×" ? "*" : "/";
      const result = operator === "*" ? left * right : left / right;
      workingTokens.splice(i - 1, 3, result.toString());
      i -= 2;
    }
  }

  // Pass 3: Handle + dan -
  for (let i = 1; i < workingTokens.length; i += 2) {
    if (workingTokens[i] === "+" || workingTokens[i] === "−") {
      const left = parseFloat(workingTokens[i - 1]);
      const right = parseFloat(workingTokens[i + 1]);

      const operator = workingTokens[i] === "+" ? "+" : "-";
      const result = operator === "+" ? left + right : left - right;
      workingTokens.splice(i - 1, 3, result.toString());
      i -= 2;
    }
  }

  // Hasilnya adalah single token
  return parseFloat(workingTokens[0]);
}

/*
  formatNumber(num) - Format number untuk display
  
  Logika:
  - Bulatkan ke 10 desimal untuk mencegah floating point errors
  - Hapus trailing zeros
  - Batasi panjang untuk display
  - Gunakan scientific notation jika terlalu besar
*/
function formatNumber(num) {
  // Bulatkan untuk menghindari floating point errors
  let rounded = Math.round(num * 10000000000) / 10000000000;

  // Konversi ke string
  let str = rounded.toString();

  // Jika terlalu panjang, gunakan scientific notation
  if (str.length > CONFIG.MAX_DISPLAY_LENGTH) {
    str = rounded.toExponential(6);
  }

  return str;
}

// ============================================================================
// ERROR HANDLING - Menangani error state
// ============================================================================

/*
  setError() - Set error state dan tampilkan "Error" di display
*/
function setError() {
  calculatorState.isError = true;
  calculatorState.displayValue = "Error";
  calculatorState.expression = "";
  calculatorState.justEvaluated = false;
  calculatorState.lastWasOperator = false;
  updateDisplay();
}

// ============================================================================
// HISTORY MANAGEMENT - Manajemen riwayat perhitungan
// ============================================================================

/*
  addToHistory(expression, result) - Tambahkan entry baru ke riwayat
*/
function addToHistory(expression, result) {
  const entry = {
    expression: expression,
    result: result,
    timestamp: Date.now(),
  };

  // Tambah ke awal array (LIFO - Last In First Out)
  calculatorState.history.unshift(entry);

  // Batasi jumlah history items
  if (calculatorState.history.length > CONFIG.MAX_HISTORY_ITEMS) {
    calculatorState.history.pop();
  }

  // Simpan ke localStorage
  saveHistoryToStorage();

  // Update history display
  renderHistory();
}

/*
  renderHistory() - Render ulang history list di UI
*/
function renderHistory() {
  const historyList = document.getElementById("historyList");
  historyList.innerHTML = "";

  calculatorState.history.forEach((entry, index) => {
    const li = document.createElement("li");
    li.className = "history-item";
    li.setAttribute("role", "button");
    li.setAttribute("tabindex", "0");

    const expressionDiv = document.createElement("div");
    expressionDiv.className = "history-expression";
    expressionDiv.textContent = entry.expression;

    const resultDiv = document.createElement("div");
    resultDiv.className = "history-result";
    resultDiv.textContent = entry.result;

    li.appendChild(expressionDiv);
    li.appendChild(resultDiv);

    // Event listener untuk restore result
    li.addEventListener("click", () => restoreFromHistory(entry));

    // Keyboard support untuk history items
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        restoreFromHistory(entry);
      }
    });

    historyList.appendChild(li);
  });
}

/*
  restoreFromHistory(entry) - Restore calculation dari history entry
*/
function restoreFromHistory(entry) {
  // Jika ada error, clear dulu
  if (calculatorState.isError) {
    clearCalculator();
  }

  // Set display ke result
  calculatorState.displayValue = entry.result;
  calculatorState.expression = entry.result;
  calculatorState.justEvaluated = true;
  calculatorState.lastWasOperator = false;

  updateDisplay();
}

/*
  toggleHistoryPanel() - Toggle tampilan history panel dengan slide animation
*/
function toggleHistoryPanel() {
  const historyPanel = document.getElementById("historyPanel");
  const toggleBtn = document.getElementById("historyToggle");

  historyPanel.classList.toggle("visible");
  toggleBtn.setAttribute(
    "aria-expanded",
    historyPanel.classList.contains("visible")
  );
}

/*
  saveHistoryToStorage() - Simpan history ke localStorage
*/
function saveHistoryToStorage() {
  try {
    const historyData = JSON.stringify(calculatorState.history);
    localStorage.setItem(CONFIG.HISTORY_STORAGE_KEY, historyData);
  } catch (error) {
    // Jika localStorage penuh atau tidak tersedia, silent fail
    console.warn("Tidak dapat menyimpan history ke localStorage:", error);
  }
}

/*
  loadHistoryFromStorage() - Muat history dari localStorage saat startup
*/
function loadHistoryFromStorage() {
  try {
    const historyData = localStorage.getItem(CONFIG.HISTORY_STORAGE_KEY);
    if (historyData) {
      calculatorState.history = JSON.parse(historyData);
      renderHistory();
    }
  } catch (error) {
    // Jika ada error parsing, mulai dengan history kosong
    console.warn("Tidak dapat memuat history dari localStorage:", error);
    calculatorState.history = [];
  }
}

// ============================================================================
// UTILITY FUNCTIONS - Fungsi helper
// ============================================================================

/*
  isOperatorSymbol(char) - Cek apakah character adalah operator
*/
function isOperatorSymbol(char) {
  return ["+", "−", "×", "÷", "%"].includes(char);
}

/*
  normalizeOperator(operator) - Konversi operator keyboard ke symbol display
  
  Mapping:
  - '+' -> '+'
  - '-' -> '−' (unicode minus)
  - '*' -> '×' (unicode multiply)
  - '/' -> '÷' (unicode divide)
  - '%' -> '%'
*/
function normalizeOperator(operator) {
  const normalizationMap = {
    "+": "+",
    "-": "−",
    "*": "×",
    "/": "÷",
    "%": "%",
  };
  return normalizationMap[operator] || operator;
}

// ============================================================================
// DISPLAY UPDATE - Update UI display
// ============================================================================

/*
  updateDisplay() - Update display areas dengan state saat ini
*/
function updateDisplay() {
  const expressionDisplay = document.getElementById("expressionDisplay");
  const resultDisplay = document.getElementById("resultDisplay");

  // Update expression display
  if (calculatorState.expression === "") {
    expressionDisplay.textContent = "0";
  } else {
    expressionDisplay.textContent = calculatorState.expression;
  }

  // Update result display
  resultDisplay.textContent = calculatorState.displayValue;

  // Add error class jika error
  if (calculatorState.isError) {
    resultDisplay.classList.add("error");
  } else {
    resultDisplay.classList.remove("error");
  }

  // Announce ke screen readers
  if (calculatorState.isError) {
    resultDisplay.setAttribute("aria-label", "Error");
  } else {
    resultDisplay.setAttribute(
      "aria-label",
      "Result: " + calculatorState.displayValue
    );
  }
}
