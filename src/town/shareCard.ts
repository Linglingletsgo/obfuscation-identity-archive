/**
 * 分享卡生成：纯前端 canvas 绘制，浏览器自带 CJK 字体，无需服务端。
 * 输出 1080×1350（小红书/朋友圈 4:5 比例）。
 */

import type { Resident } from "./townApi";

const W = 1080;
const H = 1350;
const INK = "#1a1a1a";
const PAPER = "#faf7f0";

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const char of text) {
    if (char === "\n") {
      lines.push(current);
      current = "";
      continue;
    }
    if (ctx.measureText(current + char).width > maxWidth) {
      lines.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawWobblyRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const jitter = () => (Math.random() - 0.5) * 6;
  ctx.beginPath();
  ctx.moveTo(x + jitter(), y + jitter());
  ctx.quadraticCurveTo(x + w / 2, y + jitter(), x + w + jitter(), y + jitter());
  ctx.quadraticCurveTo(x + w + jitter(), y + h / 2, x + w + jitter(), y + h + jitter());
  ctx.quadraticCurveTo(x + w / 2, y + h + jitter(), x + jitter(), y + h + jitter());
  ctx.quadraticCurveTo(x + jitter(), y + h / 2, x + jitter(), y + jitter());
  ctx.closePath();
}

async function svgToImage(svgElement: SVGSVGElement): Promise<HTMLImageElement> {
  const svgText = new XMLSerializer().serializeToString(svgElement);
  const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function renderShareCard(
  resident: Resident,
  avatarSvg: SVGSVGElement | null,
  siteUrl: string,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建画布");

  const font = (size: number, weight = 400) =>
    `${weight} ${size}px "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", sans-serif`;

  // 纸面背景
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  // 手绘边框
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  drawWobblyRect(ctx, 50, 50, W - 100, H - 100);
  ctx.stroke();

  // 顶部标题
  ctx.fillStyle = INK;
  ctx.font = font(34, 600);
  ctx.textAlign = "center";
  ctx.fillText("混 淆 小 镇 · 居 民 档 案", W / 2, 140);

  // 头像
  if (avatarSvg) {
    const img = await svgToImage(avatarSvg);
    ctx.drawImage(img, W / 2 - 160, 190, 320, 320);
  }

  // 名字 + 碎片
  ctx.font = font(64, 700);
  ctx.fillText(resident.identity_name, W / 2, 600);
  ctx.font = font(32);
  ctx.fillStyle = "#6b6b6b";
  const fragmentLines = wrapText(ctx, `「${resident.carried_fragment}」`, W - 280);
  fragmentLines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, W / 2, 668 + i * 46);
  });

  // 简介
  ctx.fillStyle = INK;
  ctx.font = font(30);
  ctx.textAlign = "left";
  const introLines = wrapText(ctx, resident.intro, W - 280);
  introLines.slice(0, 8).forEach((line, i) => {
    ctx.fillText(line, 140, 810 + i * 50);
  });

  // 底部
  ctx.textAlign = "center";
  ctx.fillStyle = "#6b6b6b";
  ctx.font = font(26);
  ctx.fillText("捏造一个身份，迷惑你的推荐算法", W / 2, H - 160);
  ctx.font = font(28, 600);
  ctx.fillStyle = INK;
  ctx.fillText(siteUrl, W / 2, H - 110);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("生成图片失败"));
    }, "image/png");
  });
}

export async function downloadShareCard(
  resident: Resident,
  avatarSvg: SVGSVGElement | null,
): Promise<void> {
  const siteUrl = `${window.location.host}/town/resident/${resident.id}`;
  const blob = await renderShareCard(resident, avatarSvg, siteUrl);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `混淆小镇-${resident.identity_name}.png`;
  link.click();
  URL.revokeObjectURL(url);
}
