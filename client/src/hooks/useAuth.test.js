import { render, screen } from "@testing-library/react";
import authContext from "../contexts/AuthContext";
import useAuth from "./useAuth";

function Consumer() {
  const auth = useAuth();
  return <div>{auth ? `user:${auth.activeUser?.userId ?? "none"}` : "no-context"}</div>;
}

describe("useAuth", () => {
  it("returns the value provided by the nearest authContext.Provider", () => {
    render(
      <authContext.Provider value={{ activeUser: { userId: "u1" } }}>
        <Consumer />
      </authContext.Provider>
    );

    expect(screen.getByText("user:u1")).toBeInTheDocument();
  });

  it("returns the context's default value (null) when rendered outside a Provider", () => {
    render(<Consumer />);

    expect(screen.getByText("no-context")).toBeInTheDocument();
  });
});
