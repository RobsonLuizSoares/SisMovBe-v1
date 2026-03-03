import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <p className="text-muted-foreground">A página que você busca não existe.</p>
      <Link href="/" className="text-primary underline hover:no-underline">
        Voltar ao início
      </Link>
    </div>
  );
}
