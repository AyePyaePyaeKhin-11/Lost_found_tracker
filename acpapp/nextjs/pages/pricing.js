export default function Pricing() {
  return (
    <div className="p-8 max-w-4xl mx-auto text-center">
      <h1 className="text-3xl font-bold mb-4">Pricing & Checkout</h1>
      <p className="text-gray-600 mb-8">Select a plan to upgrade your workspace tier.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold">Free Tier</h2>
          <p className="my-4">$0 / month</p>
          <button className="bg-gray-200 px-4 py-2 rounded">Current Plan</button>
        </div>
        <div className="border p-6 rounded-lg shadow-sm border-blue-500">
          <h2 className="text-xl font-bold">Pro Tier</h2>
          <p className="my-4">$9.99 / month</p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded">Simulate Payment</button>
        </div>
      </div>
    </div>
  );
}