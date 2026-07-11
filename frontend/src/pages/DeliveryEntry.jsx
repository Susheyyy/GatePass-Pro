import { useState, useEffect } from 'react';
import { Truck } from 'lucide-react';
import { visitorApi } from '../services/api';
import { FormInput, FormButton } from '../components/FormComponents';
import { useToast } from '../context/ToastContext';

export default function DeliveryEntry() {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '',
    company: 'Amazon',
    flatNo: '',
    mobile: '',
    vehicleNumber: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Delivery Entry | GatePass Pro';
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^[a-zA-Z]+-\d+$/.test(formData.flatNo.trim())) {
      toast.warning('Flat number must be in Alphabet-number format (e.g. B-202).');
      return;
    }
    if (!/^\d{8,15}$/.test(formData.mobile.trim())) {
      toast.warning('Mobile number must contain 8 to 15 digits.');
      return;
    }

    setSubmitting(true);
    try {
      await visitorApi.create({
        name: formData.name.trim(),
        type: 'Delivery',
        mobile: formData.mobile.trim(),
        flatNo: formData.flatNo.trim().toUpperCase(),
        purpose: formData.company,
        vehicleNumber: formData.vehicleNumber.trim().toUpperCase(),
        status: 'Checked In'
      });
      toast.success('Delivery checked in successfully!');
      setFormData({
        name: '',
        company: 'Amazon',
        flatNo: '',
        mobile: '',
        vehicleNumber: ''
      });
    } catch (err) {
      toast.error(err.message || 'Failed to check in delivery.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '600px', margin: '0 auto' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Truck size={28} style={{ color: 'var(--primary)' }} />
          <span>New Delivery Entry</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
          Record and authorize incoming parcel or courier deliveries at the gate.
        </p>
      </div>

      <div className="content-card" style={{ padding: '36px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <FormInput
            label="Delivery Person Name"
            name="name"
            placeholder="e.g. Rahul"
            value={formData.name}
            onChange={handleInputChange}
            required
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>
              Delivery Company <span style={{ color: 'var(--accent)' }}>*</span>
            </label>
            <select
              name="company"
              value={formData.company}
              onChange={handleInputChange}
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1.5px solid var(--border)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.95rem',
                outline: 'none',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                transition: 'var(--transition)'
              }}
            >
              <option value="Amazon">Amazon</option>
              <option value="Flipkart">Flipkart</option>
              <option value="Swiggy">Swiggy</option>
              <option value="Zomato">Zomato</option>
              <option value="Fedex">Fedex</option>
              <option value="DHL">DHL</option>
              <option value="BlueDart">BlueDart</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <FormInput
            label="Destination Flat No"
            name="flatNo"
            placeholder="e.g. B-202"
            value={formData.flatNo}
            onChange={handleInputChange}
            required
          />

          <FormInput
            label="Mobile Number"
            name="mobile"
            placeholder="e.g. 9876543210"
            value={formData.mobile}
            onChange={handleInputChange}
            required
          />

          <FormInput
            label="Vehicle Number"
            name="vehicleNumber"
            placeholder="e.g. MH-12-AB-1234"
            value={formData.vehicleNumber}
            onChange={handleInputChange}
          />

          <div style={{ marginTop: '10px' }}>
            <FormButton type="submit" variant="primary" disabled={submitting} style={{ width: '100%', padding: '14px' }}>
              <span>{submitting ? 'Checking In...' : 'Verify & Check In'}</span>
            </FormButton>
          </div>
        </form>
      </div>
    </div>
  );
}
