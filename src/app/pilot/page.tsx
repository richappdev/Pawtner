const items = [
  "確認合作中途與公開聯絡窗口",
  "完成毛孩資料、照片與送養狀態檢查",
  "設定領養申請回覆流程與責任人",
  "確認個資、領養與中途條款已經法務審查",
  "測試登入、收藏、推薦與申請的完整路徑",
  "確認物資商品、付款與配送資訊",
  "建立緊急事件與爭議處理聯絡方式",
];

export default function PilotPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-5 py-12">
      <p className="text-sm font-bold tracking-[0.16em] text-accent uppercase">Pilot</p>
      <h1 className="display mt-2 text-4xl">試營運上線清單</h1>
      <p className="mt-4 leading-7 text-muted">只讀清單，協助團隊在公開前逐項確認。</p>
      <ol className="mt-10 space-y-4">
        {items.map((item, index) => (
          <li key={item} className="flex items-start gap-4 border-b pb-4">
            <span className="display text-2xl text-accent">{String(index + 1).padStart(2, "0")}</span>
            <span className="pt-1 font-semibold">{item}</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
