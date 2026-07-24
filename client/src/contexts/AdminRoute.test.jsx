import { render, screen } from "@testing-library/react";
import authContext from "./AuthContext";
import AdminRoute from "./AdminRoute.jsx";

const mockNavigate = jest.fn();
jest.mock("react-router", () => ({
  ...jest.requireActual("react-router"),
  useNavigate: () => mockNavigate,
}));

function renderWithAuth(activeUser) {
  return render(
    <authContext.Provider value={{ activeUser }}>
      <AdminRoute>
        <div>Admin content</div>
      </AdminRoute>
    </authContext.Provider>
  );
}

describe("AdminRoute", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("does not redirect when the active user is an admin", () => {
    renderWithAuth({ userId: "u1", isAdmin: true });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByText("Admin content")).toBeInTheDocument();
  });

  it("redirects to '/' when there is no active user", () => {
    renderWithAuth(null);

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("redirects to '/' when the active user is not an admin", () => {
    renderWithAuth({ userId: "u1", isAdmin: false });

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
