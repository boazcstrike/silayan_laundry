"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import categories from "@/app/assets/data/list";

export default function LaundryCounter() {
  type Items = { [key: string]: number };

  const [items, setItems] = useState<Items>(() => {
    const all: Items = {};
    Object.entries(categories).forEach(([group, names]) => {
      names.forEach(({ name }) => (all[name] = 0));
    });
    return all;
  });
  const [customItems, setCustomItems] = useState<Items>({});
  const [newCustomItem, setNewCustomItem] = useState("");

  const updateCount = (name: string, delta: number, custom: boolean = false) => {
    const setFn = custom ? setCustomItems : setItems;
    const source = custom ? customItems : items;
    setFn({ ...source, [name]: Math.max(0, (source[name] || 0) + delta) });
  };

  const resetCounts = () => {
    if (window.confirm("Are you sure you want to reset all counts? This action cannot be undone.")) {
      setItems(() => {
        const all: Items = {};
        Object.entries(categories).forEach(([group, names]) => {
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

  const processSubmission = () => {
    generateTextFile();
    generateImage(items);
  };

  const generateImage = async (data: Record<string, number>) => {
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
    categories["Regular Laundry"].forEach((item) => {
      ctx.fillText(String(data[item.name] || 0), item.x, item.y);
    });
    categories["Home Items"].forEach((item) => {
      ctx.fillText(String(data[item.name] || 0), item.x, item.y);
    });
    categories["Other Items"].forEach((item) => {
      ctx.fillText(String(data[item.name] || 0), item.x, item.y);
    });

    const signature = new Image();
    signature.src = "/signature_bo.png"; 
    await signature.decode();
    ctx.drawImage(signature, 735, 1098, signature.width * 0.55, signature.height * 0.55);
    ctx.fillText(date_today, 850, 1214);

    const timestamp = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15);
    const link = document.createElement("a");
    link.download = `laundry-output-${timestamp}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const generateTextFile = async () => {
    let data = "Laundry Items List\n\n";
    Object.entries(categories).forEach(([group, names]) => {
      data += `== ${group} ==\n`;
      names.forEach(({ name }) => {
        if (items[name] > 0) data += `${name}: ${items[name]}\n`;
      });
    });
    if (Object.keys(customItems).length) {
      data += `\n== Custom Items ==\n`;
      Object.entries(customItems).forEach(([name, count]) => {
        if (count > 0) data += `${name}: ${count}\n`;
      });
    }

    const timestamp = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15);
    const filename = `./output/${timestamp}.txt`;
    const blob = new Blob([data], { type: "text/plain" });
    const a = document.createElement("a");
    const filePath = `./dump/${timestamp}.txt`;
    await fetch(filePath, {
      method: 'PUT',
      body: blob,
    });
    // if you need to download to the user's device
    // a.href = URL.createObjectURL(blob);
    // a.download = filename;
    // a.click();
  };

  const renderItemControls = (name: string, value: number, isCustom: boolean = false) => (
    <div className="flex items-center gap-2 mb-1" key={name}>
      <div className="w-48">{name}</div>
      <Button onClick={() => updateCount(name, -1, isCustom)}>-</Button>
      <div>{value}</div>
      <Button onClick={() => updateCount(name, 1, isCustom)}>+</Button>
    </div>
  );

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Laundry Item Counter</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 mb-6">
        {Object.entries(categories).map(([group, names]) => (
          <div key={group}>
          <h2 className="text-lg font-semibold mb-2">{group}</h2>
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
      
      <Button onClick={resetCounts}>Reset Counts</Button>
      <Button onClick={processSubmission}>Submit and Download</Button>

    </div>
  );
}
