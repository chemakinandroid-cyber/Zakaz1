 "use client";
import React, { useState } from "react";

const branches = [
  {
    id: "konechnaya",
    name: "На Виражах — Конечная",
    address: "ул. Конечная, 10/4",
    phone: "+79085932688",
    open: "10:00",
    close: "22:00"
  },
  {
    id: "airport",
    name: "На Виражах — Аэропорт",
    address: "п. Аэропорт, 7",
    phone: "+79024524222",
    open: "10:00",
    close: "21:00"
  }
];

const items = [
  { id: 1, name: "Шаурма «На Виражах»", variant:"курица", price:260 },
  { id: 2, name: "Шаурма «На Виражах»", variant:"свинина", price:270 },
  { id: 3, name: "Чикен Карго", price:300 },
  { id: 4, name: "Датский хот-дог", price:230 },
  { id: 5, name: "Шашлык", price:400 },
  { id: 6, name: "Капучино", price:210 },
  { id: 7, name: "Морс", price:100 },
];

export default function Page() {
  const [branch, setBranch] = useState(branches[0]);
  const [cart, setCart] = useState([]);

  const add = (item)=>setCart([...cart,item]);

  const total = cart.reduce((s,i)=>s+i.price,0);

  return (
    <div style={{padding:20}}>
      <h1>На Виражах</h1>

      <h2>Точки</h2>
      {branches.map(b=>(
        <div key={b.id} style={{border:"1px solid #ccc",padding:10,marginBottom:10}}>
          <b>{b.name}</b><br/>
          {b.address}<br/>
          📞 <a href={`tel:${b.phone}`}>{b.phone}</a><br/>
          {b.open}-{b.close}<br/>
          <button onClick={()=>setBranch(b)}>Выбрать</button>
        </div>
      ))}

      <h2>Меню ({branch.name})</h2>
      {items.map(i=>(
        <div key={i.id} style={{border:"1px solid #ddd",padding:10,marginBottom:10}}>
          <b>{i.name}</b> {i.variant && `(${i.variant})`}<br/>
          {i.price} ₽<br/>
          <button onClick={()=>add(i)}>В корзину</button>
        </div>
      ))}

      <h2>Корзина</h2>
      {cart.map((c,i)=><div key={i}>{c.name} — {c.price} ₽</div>)}
      <b>Итого: {total} ₽</b>
    </div>
  );
}
