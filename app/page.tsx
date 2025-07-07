"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import categories from "@/app/assets/data/list";


export default function LaundryCounter() {
  type Items = { [key: string]: number };

  const [items, setItems] = useState<Items>(() => {
    const all: Items = {};
    Object.entries(categories).forEach(([group, names]) => {
      names.forEach((name) => (all[name] = 0));
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

  const addCustomItem = () => {
    if (!newCustomItem.trim()) return;
    setCustomItems({ ...customItems, [newCustomItem]: 0 });
    setNewCustomItem("");
  };

  const generateTextFile = () => {
    let data = "Laundry Items List\n\n";
    Object.entries(categories).forEach(([group, names]) => {
      data += `== ${group} ==\n`;
      names.forEach((name) => {
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
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
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
          {names.map((name) => renderItemControls(name, items[name]))}
          </div>
      ))}
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Custom Items</h2>
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

      <Button onClick={generateTextFile}>Submit and Download</Button>
    </div>
  );
}
