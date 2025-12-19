"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import categories from "@/app/assets/data/list";

export default function LaundryCounter() {
  type Items = { [key: string]: number };

  const [items, setItems] = useState<Items>(() => {
    const all: Items = {};
    Object.entries(categories).forEach(([, names]) => {
      names.forEach(({ name }) => (all[name] = 0));
    });
    return all;
  });
  const [customItems, setCustomItems] = useState<Items>({});
  const [newCustomItem, setNewCustomItem] = useState("");
  const [isSendingToDiscord, setIsSendingToDiscord] = useState(false);

  const updateCount = (name: string, delta: number, custom: boolean = false) => {
    const setFn = custom ? setCustomItems : setItems;
    const source = custom ? customItems : items;
    setFn({ ...source, [name]: Math.max(0, (source[name] || 0) + delta) });
  };

  const setCount = (name: string, next: number, custom: boolean = false) => {
    const setFn = custom ? setCustomItems : setItems;
    const source = custom ? customItems : items;
    const value = Number.isFinite(next) ? Math.max(0, Math.trunc(next)) : 0;
    setFn({ ...source, [name]: value });
  };

  const resetCounts = () => {
    if (window.confirm("Are you sure you want to reset all counts? This action cannot be undone.")) {
      setItems(() => {
        const all: Items = {};
        Object.entries(categories).forEach(([, names]) => {
          names.forEach(({ name }) => (all[name] = 0));
        });
        return all;
      });
      setCustomItems({});
    }
  };

  const addCustomItem = () => {
    if (!newCustomItem.trim()) return;
    setCustomItems({ ...customItems, [newCustomItem]: 0 });
    setNewCustomItem("");
  };

  const makeTimestamp = () =>
    new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15);

  const downloadBlob = (blob: Blob, filename: string) => {
    const link = document.createElement("a");
    link.download = filename;
    link.href = URL.createObjectURL(blob);
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
  };

  const sendImageToDiscord = async (image: Blob, timestamp: string) => {
    const form = new FormData();
    const file = new File([image], `laundry-output-${timestamp}.png`, {
      type: "image/png",
    });

    form.append("file", file);
    form.append(
      "message",
      `Laundry submission (${new Date().toLocaleString("en-US")})`
    );

    const res = await fetch("/api/discord", {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const details = await res.text().catch(() => "");
      alert(`Discord upload failed (${res.status}). ${details}`);
    }
  };

  const canvasToBlob = (canvas: HTMLCanvasElement) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Failed to generate PNG"));
          resolve(blob);
        },
        "image/png",
        1
      );
    });

  const generateImageBlob = async (data: Record<string, number>) => {
    const img = new Image();
    img.src = "/template.jpg";
    await img.decode();

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    ctx.fillStyle = "black";
    ctx.font = "32px Arial";

    const date_today = new Date().toLocaleDateString("en-US");
    ctx.fillText(date_today, 250, 250);

    const drawIfPositive = (value: number, x: number, y: number) => {
      if (value > 0) ctx.fillText(String(value), x, y);
    };

    categories["Regular Laundry"].forEach((item) => {
      drawIfPositive(data[item.name] || 0, item.x, item.y);
    });
    categories["Home Items"].forEach((item) => {
      drawIfPositive(data[item.name] || 0, item.x, item.y);
    });
    categories["Other Items"].forEach((item) => {
      drawIfPositive(data[item.name] || 0, item.x, item.y);
    });
    
    // temp disable
    // Total quantity (ONLY for items in the template image). Set your own coordinates.
    // const totalQuantity = [
    //   ...categories["Regular Laundry"],
    //   ...categories["Home Items"],
    //   ...categories["Other Items"],
    // ].reduce((sum, item) => sum + (data[item.name] || 0), 0);

    // const TOTAL_QTY_X = 800;
    // const TOTAL_QTY_Y = 43.5 * 12 + 40 * 2;
    // if (totalQuantity > 0) {
    //   ctx.fillText(String(totalQuantity), TOTAL_QTY_X, TOTAL_QTY_Y);
    // }

    const signature = new Image();
    signature.src = "/signature_bo.png";
    await signature.decode();
    ctx.drawImage(
      signature,
      735,
      1098,
      signature.width * 0.55,
      signature.height * 0.55
    );
    ctx.fillText(date_today, 850, 1214);

    return canvasToBlob(canvas);
  };

  const onDownloadImage = async () => {
    const timestamp = makeTimestamp();
    const blob = await generateImageBlob(items);
    downloadBlob(blob, `laundry-output-${timestamp}.png`);
  };

  const onSendToDiscord = async () => {
    if (isSendingToDiscord) return;

    setIsSendingToDiscord(true);
    try {
      const timestamp = makeTimestamp();
      const blob = await generateImageBlob(items);
      await sendImageToDiscord(blob, timestamp);
    } finally {
      setIsSendingToDiscord(false);
    }
  };

  const renderItemControls = (name: string, value: number, isCustom: boolean = false) => (
    <div
      className="flex items-center gap-1 mb-2 min-h-[48px]" // more gap and row height for breathing room
      key={name}
    >
      <div className="flex-1 min-w-0">
        <span className="block font-normal text-base break-words text-right pr-2">{name}</span>
      </div>
      <Button onClick={() => updateCount(name, -1, isCustom)}>-</Button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        className="no-spinner h-9 w-9 rounded-md border bg-background px-2 text-center text-sm"
        value={value}
        onChange={(e) => {
          const next = e.target.value === "" ? 0 : Number(e.target.value);
          setCount(name, next, isCustom);
        }}
      />
      <Button onClick={() => updateCount(name, 1, isCustom)}>+</Button>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-xl font-bold mb-4 text-center">Laundry Item Counter</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-6">
        {Object.entries(categories).map(([group, names]) => (
          <div key={group}>
            <h2 className="text-lg font-semibold mb-2 text-right">{group}</h2>
            {names.map(({ name }) => renderItemControls(name, items[name]))}
          </div>
        ))}
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Custom Items (this cannot be added in the image)</h2>
        <div className="flex gap-2 mb-2">
          <input
            className="border px-2 py-1"
            value={newCustomItem}
            onChange={(e) => setNewCustomItem(e.target.value)}
            placeholder="Add custom item"
          />
          <Button onClick={addCustomItem}>Add</Button>
        </div>
        {Object.entries(customItems).map(([name, value]) =>
          renderItemControls(name, value, true)
        )}
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={resetCounts}>Reset Counts</Button>
          <Button onClick={onDownloadImage}>Download Image</Button>
          <Button
            variant="secondary"
            onClick={onSendToDiscord}
            disabled={isSendingToDiscord}
          >
            {isSendingToDiscord && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSendingToDiscord ? "Sending..." : "Send to Discord"}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Tip: Life is good.
        </p>
      </div>

    </div>
  );
}
