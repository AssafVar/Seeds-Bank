import { render, screen } from "@testing-library/react";
import authContext from "./AuthContext";
import ProtectedRoute from "./ProtectedRoute.jsx";

const mockNavigate = jest.fn();
jest.mock("react-router", () => ({
  ...jest.requireActual("react-router"),
  useNavigate: () => mockNavigate,
}));

function renderWithAuth(activeUser) {
  return render(
    <authContext.Provider value={{ activeUser }}>
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    </authContext.Provider>
  );
}

describe("ProtectedRoute", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("does not redirect when there is an active user", () => {
    renderWithAuth({ userId: "u1" });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("redirects to '/' when there is no active user", () => {
    renderWithAuth(null);

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
