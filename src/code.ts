import { Buffer } from 'buffer';
import { create } from 'domain';
// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for the plugins. It has access to the *document*.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (see documentation).

// This shows the HTML page in "ui.html".
figma.showUI(__html__);

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = (msg) => {
  // One way of distinguishing between different types of messages sent from
  // your HTML page is to use an object with a "type" property like this.
  if (msg.type === 'get-tokens') {
    // downloadFile('12aj1SvMkhEut5CBw334ksQSzg0UTzGf1');
    getTokensFromGit('StefanKandlbinder', 'resume-builder', 'tokens.json');

    /* figma.ui.postMessage({
      type: 'get-tokens',
      message: `Created ${msg.count} Rectangles`,
    }); */
  }

  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
  // figma.closePlugin();
};

const getTokensFromGit = async (owner: string, repo: string, path: string) => {
  let fileSHA;

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
    );
    const data = await response.json();

    fileSHA = data.sha;
  } catch (error) {
    console.log(error);
  }

  getFileBlob(owner, repo, fileSHA);
};

const getFileBlob = async (owner: string, repo: string, fileSHA: any) => {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/blobs/${fileSHA}`
    );
    const data = await response.json();

    let fileBlob = data.content;
    convertBlob(fileBlob);
  } catch (error) {
    console.log(error);
  }
};

const convertBlob = async (blob: any) => {
  // console.log(blob)
  try {
    const fileContents = Buffer.from(blob, 'base64').toString();
    const jsonData = JSON.parse(fileContents);
    const colors = traverseObject(jsonData.global.colors);
    createColors(colors);
  } catch (error) {
    console.log(error);
  }
};

function traverseObject(obj: any, keys: any = [], colors: any = []) {
  // Loop through all the keys in the object
  for (const key in obj) {
    // If the current value is an object, recursively call the function on it
    if (typeof obj[key] === 'object') {
      // Add the current key to the keys array and call the function recursively
      keys.push(key);
      traverseObject(obj[key], keys, colors);
      // Remove the current key from the keys array to backtrack
      keys.pop();
    } else if (key === 'type' && obj[key] === 'color') {
      // If the current key is "type" and the value is "COLOR", add the color to the colors array
      colors.push({
        name: ['colors', ...keys].join('.'),
        value: obj.value,
      });
    }
  }
  return colors;
}

function createColors(colors: any) {
  const nodes: SceneNode[] = [];
  const outer = figma.createFrame();
  outer.layoutMode = 'VERTICAL';
  outer.counterAxisSizingMode = 'AUTO';
  outer.primaryAxisAlignItems = 'MIN';
  outer.fills = [];

  for (let i = 0; i < colors.length; i++) {
    const frame = figma.createFrame();
    frame.layoutMode = 'HORIZONTAL';
    frame.counterAxisSizingMode = 'AUTO';
    frame.counterAxisAlignItems = 'CENTER';
    frame.itemSpacing = 8;
    frame.fills = [];

    const klecks = figma.createRectangle();
    const name = createText(colors[i].name, frame);
    const description = createText('blabla', frame);
    const value = createText(colors[i].value, frame);
    const rawValue = createText(colors[i].value, frame);

    klecks.resize(16, 16);
    klecks.cornerRadius = 8;
    const fill = convertHexToRGB(colors[i].value);
    klecks.fills = [{ type: 'SOLID', color: fill }];

    frame.y = i * 20;
    frame.name = colors[i].name;
    frame.appendChild(klecks);
    outer.appendChild(frame);
  }

  figma.currentPage.appendChild(outer);
  figma.currentPage.selection = nodes;
  figma.viewport.scrollAndZoomIntoView(nodes);
}

const createText = async (content: string, frame: FrameNode) => {
  const text = figma.createText();

  // Move to (50, 50)
  // text.x = 24;
  // text.y = 50;

  // Load the font in the text node before setting the characters
  await figma.loadFontAsync(text.fontName as FontName);
  text.characters = content;

  // Set bigger font size and red color
  text.fontSize = 16;
  text.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];

  frame.appendChild(text);
};

const convertHexToRGB = (hexCode: string) => {
  let hex = hexCode.replace('#', '');

  if (hex.length === 3) {
    hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
  }

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  let rgb = { r, g, b };

  return rgb;
};

const convertHexToRGBA = (hexCode: string, opacity = 1) => {
  let hex = hexCode.replace('#', '');

  if (hex.length === 3) {
    hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  /* Backward compatibility for whole number based opacity values. */
  if (opacity > 1 && opacity <= 100) {
    opacity = opacity / 100;
  }

  return `rgba(${r},${g},${b},${opacity})`;
};
