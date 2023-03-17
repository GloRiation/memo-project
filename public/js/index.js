let template = document.querySelector("template");
let memoList = document.querySelector(".memo-list");
// let memos = ["123", "456", "hk add oil", "testing"];

for (let memo of memos) {
  let node = template.content.querySelector(".memo").cloneNode(true);
  node.querySelector(".content").textContent = memo.content;
  memoList.appendChild(node);
}
