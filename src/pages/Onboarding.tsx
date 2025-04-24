// src/pages/Onboarding.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    income: "",
    debt: "",
    emergencyFund: "",
    goalType: "save",
    goalName: "",
    goalAmount: "",
  });

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!user) return;

    await supabase.from("goals").insert([
      {
        user_id: user.id,
        name: formData.goalName,
        type: formData.goalType,
        target_amount: parseFloat(formData.goalAmount),
        current_saved: 0,
        priority: "High",
      },
    ]);

    await supabase
      .from("profiles")
      .update({
        name: formData.name,
        age: parseInt(formData.age),
        income: parseFloat(formData.income),
        debt: parseFloat(formData.debt),
        emergency_fund: parseFloat(formData.emergencyFund),
        onboarding_complete: true,
      })
      .eq("id", user.id);

    navigate("/");
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold">Welcome to Goalwise</h2>

      {step === 1 && (
        <>
          <p className="text-sm text-muted-foreground">Let's get started with your info:</p>
          <input
            type="text"
            name="name"
            placeholder="Your first name"
            value={formData.name}
            onChange={handleChange}
            className="w-full border px-4 py-2 rounded mb-2"
          />
          <input
            type="number"
            name="age"
            placeholder="Your age"
            value={formData.age}
            onChange={handleChange}
            className="w-full border px-4 py-2 rounded"
          />
          <button onClick={handleNext} className="btn mt-4">Next</button>
        </>
      )}

      {step === 2 && (
        <>
          <p className="text-sm text-muted-foreground">What is your monthly income?</p>
          <input
            type="number"
            name="income"
            value={formData.income}
            onChange={handleChange}
            className="w-full border px-4 py-2 rounded"
          />
          <div className="flex justify-between mt-4">
            <button onClick={handleBack} className="btn">Back</button>
            <button onClick={handleNext} className="btn">Next</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <p className="text-sm text-muted-foreground">How much debt do you currently have?</p>
          <input
            type="number"
            name="debt"
            value={formData.debt}
            onChange={handleChange}
            className="w-full border px-4 py-2 rounded"
          />
          <div className="flex justify-between mt-4">
            <button onClick={handleBack} className="btn">Back</button>
            <button onClick={handleNext} className="btn">Next</button>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <p className="text-sm text-muted-foreground">How much do you have in an emergency fund?</p>
          <input
            type="number"
            name="emergencyFund"
            value={formData.emergencyFund}
            onChange={handleChange}
            className="w-full border px-4 py-2 rounded"
          />
          <div className="flex justify-between mt-4">
            <button onClick={handleBack} className="btn">Back</button>
            <button onClick={handleNext} className="btn">Next</button>
          </div>
        </>
      )}

      {step === 5 && (
        <>
          <p className="text-sm text-muted-foreground">What is your top financial goal?</p>
          <select
            name="goalType"
            value={formData.goalType}
            onChange={handleChange}
            className="w-full border px-4 py-2 rounded"
          >
            <option value="save">Save</option>
            <option value="payoff">Pay Off Debt</option>
          </select>
          <input
            type="text"
            name="goalName"
            placeholder="e.g. Buy a house"
            value={formData.goalName}
            onChange={handleChange}
            className="w-full border px-4 py-2 rounded mt-2"
          />
          <input
            type="number"
            name="goalAmount"
            placeholder="Target amount"
            value={formData.goalAmount}
            onChange={handleChange}
            className="w-full border px-4 py-2 rounded mt-2"
          />
          <div className="flex justify-between mt-4">
            <button onClick={handleBack} className="btn">Back</button>
            <button onClick={handleSubmit} className="btn btn-primary">Finish & Start Trial</button>
          </div>
        </>
      )}
    </div>
  );
}
