export default function Profile() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">User Profile & Account</h1>
      <div className="bg-white border rounded-lg p-6 space-y-4">
        <div><strong>Email:</strong> user@kmitl.ac.th</div>
        <div><strong>Current Tier:</strong> Free Plan</div>
        <div><strong>Role:</strong> Student / User</div>
      </div>
    </div>
  );
}