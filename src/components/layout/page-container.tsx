type Props = {
  children: React.ReactNode;
};

export function PageContainer({ children }: Props) {
  return (
    <div className="drawer-content flex flex-col bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
      <div className="container min-h-screen grid grid-rows-[auto,1fr,auto] mx-auto max-w-6xl p-8 2xl:px-0 relative">
        <div className="absolute inset-0 bg-pattern opacity-5"></div>
        <div className="relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
}
