type Props = {
  children: React.ReactNode;
};
export function DrawerContainer({ children }: Props) {
  return (
    <div className="drawer drawer-end z-50">
      <input id="my-drawer-3" type="checkbox" className="drawer-toggle" />
      {children}
    </div>
  );
}
