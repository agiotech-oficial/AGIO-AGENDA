export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <h1 className="text-4xl font-bold mb-2">404 - Página Não Encontrada</h1>
      <p className="text-gray-400 mb-4">A página que você está procurando não existe.</p>
      <a href="/" className="px-4 py-2 bg-emerald-500 text-black font-bold rounded-lg">
        Voltar ao Início
      </a>
    </div>
  );
}

