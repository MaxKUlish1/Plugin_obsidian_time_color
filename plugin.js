'use strict';

var obsidian = require('obsidian');
var state = require('@codemirror/state');
var view = require('@codemirror/view');

// Переменные, связанные с цветом
var hue = 125;  // Начальное значение цвета (0-360), например 0 - красный
var saturation = 50; // Начальное значение насыщенности
var lightness = 50; // Начальное значение светлоты
var hueAdd = 2;
var saturationAdd = 3;
var lightnessAdd = 2;

var saturationDirection = 1; // Направление изменения насыщенности
var lightnessDirection = 1; // Направление изменения светлоты

// Переменные, связанные с активностью пользователя
var timer = null;
var isUserActive = false;

// Переменные, связанные с задержками
var obsolescenceTimer = 3600000;
var continuationTimer = 5000;


// Функция для экранирования HTML
function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// Функция для получения цвета для градиента
function getColorForGradient(hue, saturation, lightness) {
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

class QuickPlugin extends obsidian.Plugin {
    constructor() {
        super(...arguments);
        this.makeExtensionThing = () => state.Prec.high(view.keymap.of([
            {
                key: 'Space',
                run: () => { this.wrapWord(' '); isUserActive = true; }
            },
            {   
                key: 'Enter',
                run: () => { this.wrapWord(' '); isUserActive = true; }
            },
            {
                key: 'Tab',
                run: () => { this.wrapWord(' '); isUserActive = true; }
            },
            {
                key: '</span>',
                run: () => { this.wrapWord(' '); isUserActive = true; }
            }
        ]));
    }
    wrapWord(separator) {
        // Получаем текущий активный вид Markdown в Obsidian
        const view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        // Если нет активного вида, выходим из функции
        if (!view)
            return false;
        // Получаем редактор и курсор
        const editor = view.editor;
        const cursor = editor.getCursor();
        // Получаем текущую строку
        const line = editor.getLine(cursor.line);

        // Создаем регулярное выражение для поиска последнего </span> или пробела
        const regex = new RegExp(`(${separator}|<\/span>)`, 'g');
        let match;
        let start = 0;
        // Ищем последний </span> или пробел перед текущим положением курсора
        while ((match = regex.exec(line)) !== null) {
            if (match.index < cursor.ch) {
                start = match.index + match[0].length;
            } else {
                break;
            }
        }

        // Определяем конец слова
        const end = cursor.ch;
        // Извлекаем слово
        const word = line.slice(start, end);
        // Создаем регулярное выражение для поиска тегов span с классом myClass
        const spanRegex = /<span class="myClass".*?<\/span>/g;
        // Если слово не пустое, не содержит тегов span и курсор не находится после </span>
        if (word.trim() !== '' && !spanRegex.test(word)) {
            // Экранируем HTML в слове
            const escapedWord = escapeHTML(word);
            // Получаем цвет для градиента
            const color = getColorForGradient(hue, saturation, lightness);
            // Получаем текущее время и часовой пояс
            const currentTime = new Date().toLocaleString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const timezoneOffset = new Date().getTimezoneOffset() / -60;
            // Оборачиваем слово в тег span с классом myClass, цветом, временем и часовым поясом
            const wrappedWord = `<span class="myClass" style="color: ${color};" time="${currentTime}" timezone="GMT${timezoneOffset >= 0 ? '+' : ''}${timezoneOffset}">${escapedWord}</span>`;
            // Заменяем слово в редакторе на обернутое слово
            editor.replaceRange(wrappedWord, { line: cursor.line, ch: start }, { line: cursor.line, ch: end });
            // Запускаем таймер
            this.startTimer();
        }
    }



    startTimer() {
        if (timer) {
            clearInterval(timer);
        }
        timer = setInterval(() => {
            if (isUserActive) {
                hue = hue + hueAdd;
                if (hue > 360) {
                    hue = hue - 360;
                }
                // Проверка границ для насыщенности и светлоты
                if (saturation <= 30) {
                    saturationDirection = 1; // Установить направление насыщенности на увеличение
                } else if (saturation >= 80) {
                    saturationDirection = -1; // Установить направление насыщенности на уменьшение
                }
                if (lightness <= 30) {
                    lightnessDirection = 1; // Установить направление светлоты на увеличение
                } else if (lightness >= 70) {
                    lightnessDirection = -1; // Установить направление светлоты на уменьшение
                }
                saturation = saturation + saturationDirection * saturationAdd; // Изменение насыщенности на saturationAdd каждый раз
                lightness = lightness + lightnessDirection * lightnessAdd; // Изменение светлоты на lightnessAdd каждый раз
                isUserActive = false; // Сбросить флаг активности после изменения цвета
                lastActivityTime = Date.now();
            } else if (Date.now() - lastActivityTime > obsolescenceTimer) { // Если прошло 3600 секунд с момента последней активности
                hue = hue + 60;
                if (hue > 360) {
                    hue = hue - 360;
                }
            }
        }, continuationTimer); // Change hue every 5 seconds
    }

    onload() {
        this.registerEditorExtension(this.makeExtensionThing());
    }
}

module.exports = QuickPlugin;
