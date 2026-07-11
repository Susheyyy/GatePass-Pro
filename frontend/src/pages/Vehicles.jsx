import { useState, useEffect } from 'react';
import { 
  Car, 
  Search, 
  Plus, 
  Trash2, 
  Phone, 
  Building, 
  AlertCircle,
} from 'lucide-react';
import { residentApi, visitorApi, getUserInfo } from '../services/api';
import { FormInput, FormButton } from '../components/FormComponents';
import { useToast } from '../context/ToastContext';

export default function Vehicles() {
  const toast = useToast();
  const { role: userRole, residentId, email: residentEmail } = getUserInfo();

  const [loading, setLoading] = useState(true);
  const [residents, setResidents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [visitors, setVisitors] = useState([]);
  const [myResidentProfile, setMyResidentProfile] = useState(null);
  const [newVehicleNumber, setNewVehicleNumber] = useState('');
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState('');

  const fetchDirectory = async () => {
    try {
      setLoading(true);
      const list = await residentApi.getAll();
      setResidents(list);
      const visitorList = await visitorApi.getAll();
      setVisitors(visitorList);
      
      if (userRole === 'resident') {
        let matched = null;
        if (residentId) {
          matched = await residentApi.getById(residentId);
        } else {
          matched = list.find(r => r._id === residentId || r.email.toLowerCase() === residentEmail?.toLowerCase());
        }
        if (matched) {
          setMyResidentProfile(matched);
        }
      }
    } catch (err) {
      toast.error('Failed to load vehicle directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Vehicles | GatePass Pro';
    fetchDirectory();
  }, [residentId, residentEmail, userRole]);

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    if (!newVehicleNumber.trim()) return;
    if (!myResidentProfile) {
      toast.error('Could not load your resident profile.');
      return;
    }

    const cleanVehicleNumber = newVehicleNumber.trim().toUpperCase();
    
    if (!/^[A-Z0-9 -]{3,15}$/.test(cleanVehicleNumber)) {
      toast.warning('Invalid vehicle number format (Use A-Z, 0-9, space or hyphen).');
      return;
    }

    const existingVehicles = myResidentProfile.vehicles || [];
    if (existingVehicles.includes(cleanVehicleNumber)) {
      toast.warning('This vehicle is already registered under your flat.');
      return;
    }

    setSavingVehicle(true);
    try {
      const updatedVehicles = [...existingVehicles, cleanVehicleNumber];
      const updated = await residentApi.update(myResidentProfile._id, {
        vehicles: updatedVehicles
      });
      setMyResidentProfile(updated);
      setNewVehicleNumber('');
      toast.success(`Vehicle ${cleanVehicleNumber} registered successfully!`);
      const list = await residentApi.getAll();
      setResidents(list);
    } catch (err) {
      toast.error('Failed to register vehicle.');
    } finally {
      setSavingVehicle(false);
    }
  };

  const triggerRemoveVehicle = (vehicleNo) => {
    setVehicleToDelete(vehicleNo);
    setIsDeleteOpen(true);
  };

  const confirmRemoveVehicle = async () => {
    if (!myResidentProfile || !vehicleToDelete) return;
    setSavingVehicle(true);
    try {
      const existingVehicles = myResidentProfile.vehicles || [];
      const updatedVehicles = existingVehicles.filter(v => v !== vehicleToDelete);
      const updated = await residentApi.update(myResidentProfile._id, {
        vehicles: updatedVehicles
      });
      setMyResidentProfile(updated);
      toast.success(`Vehicle ${vehicleToDelete} removed successfully.`);
      setIsDeleteOpen(false);
      setVehicleToDelete('');
      const list = await residentApi.getAll();
      setResidents(list);
    } catch (err) {
      toast.error('Failed to remove vehicle.');
    } finally {
      setSavingVehicle(false);
    }
  };

  
  const residentVehicles = residents.reduce((acc, res) => {
    const vehiclesList = res.vehicles || [];
    vehiclesList.forEach(veh => {
      const matchSearch = 
        veh.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.flatNo.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (matchSearch) {
        acc.push({
          vehicleNumber: veh,
          ownerName: res.name,
          flatNo: res.flatNo,
          mobile: res.mobile,
          residentId: res._id,
          isGuest: false
        });
      }
    });
    return acc;
  }, []);

  const visitorVehicles = visitors.reduce((acc, visitor) => {
    if (visitor.vehicleNumber && visitor.status === 'Checked In') {
      const matchSearch =
        visitor.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        visitor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        visitor.flatNo.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (matchSearch) {
        acc.push({
          vehicleNumber: visitor.vehicleNumber,
          ownerName: visitor.name,
          flatNo: visitor.flatNo,
          mobile: visitor.mobile,
          residentId: visitor._id,
          isGuest: true
        });
      }
    }
    return acc;
  }, []);

  const filteredVehicles = [...residentVehicles, ...visitorVehicles];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>Vehicle Directory</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Register flat vehicle numbers and search for vehicle owners in case of driveway blockage.
        </p>
      </div>

      {userRole === 'resident' && (
        <div className="content-card" style={{ padding: '24px', background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(50, 11, 53, 0.02) 100%)' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
            My Registered Vehicles
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
            Register your vehicle plate numbers so security and neighbors can reach you if your vehicle is blocking the driveway.
          </p>

          <form onSubmit={handleAddVehicle} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <FormInput
                label="Register New Vehicle Number"
                value={newVehicleNumber}
                onChange={(e) => setNewVehicleNumber(e.target.value)}
                placeholder="e.g. KA-01-AB-1234 or MH-02-1234"
                disabled={savingVehicle}
                style={{ margin: 0 }}
              />
            </div>
            <FormButton type="submit" variant="primary" disabled={savingVehicle || !newVehicleNumber.trim()} style={{ height: '42px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Plus size={16} />
              <span>{savingVehicle ? 'Saving...' : 'Add Vehicle'}</span>
            </FormButton>
          </form>

          {loading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading your vehicles...</div>
          ) : !myResidentProfile || !myResidentProfile.vehicles || myResidentProfile.vehicles.length === 0 ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              padding: '16px', 
              borderRadius: '12px', 
              backgroundColor: 'rgba(239, 68, 68, 0.05)', 
              color: 'var(--accent)',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}>
              <AlertCircle size={18} />
              <span>No vehicles registered yet. Please add your vehicles to help keep the driveway organized.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {myResidentProfile.vehicles.map((vehicle, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-main)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <Car size={16} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '1rem', color: 'var(--text-main)', letterSpacing: '0.05em' }}>
                    {vehicle}
                  </span>
                  <button
                    type="button"
                    onClick={() => triggerRemoveVehicle(vehicle)}
                    disabled={savingVehicle}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent)',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'var(--transition)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-light)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    title="Remove vehicle"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="content-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>
              Search Vehicles
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Search by vehicle plate number, resident name, or flat number.
            </p>
          </div>
          
          <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search vehicle, flat, or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 38px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-main)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'var(--transition)'
              }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            Loading vehicle directory...
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <Car size={48} style={{ color: 'var(--border)', strokeWidth: 1.5 }} />
            <span>No matching vehicle records found in the directory.</span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ paddingBottom: '12px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Vehicle Plate Number</th>
                  <th style={{ paddingBottom: '12px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Owner / Resident</th>
                  <th style={{ paddingBottom: '12px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Flat Location</th>
                  <th style={{ paddingBottom: '12px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Contact Info</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((entry, idx) => {
                  const initials = entry.ownerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'var(--transition)' }}>
                      <td style={{ padding: '16px 0' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: '800',
                          fontSize: '1rem',
                          backgroundColor: 'var(--primary-light)',
                          color: 'var(--primary)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          letterSpacing: '0.05em',
                          border: '1px solid var(--primary-border)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <Car size={14} />
                          {entry.vehicleNumber}
                        </span>
                      </td>

                      <td style={{ padding: '16px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--success-light)',
                          color: 'var(--success)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '0.8rem'
                        }}>
                          {initials}
                        </div>
                        <span style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {entry.ownerName}
                          {entry.isGuest && (
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--warning-light)',
                              color: 'var(--warning)',
                              lineHeight: 1
                            }}>
                              Guest
                            </span>
                          )}
                        </span>
                      </td>

                      <td style={{ padding: '16px 0' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                          <Building size={14} />
                          Flat {entry.flatNo}
                        </span>
                      </td>

                      <td style={{ padding: '16px 0' }}>
                        <a href={`tel:${entry.mobile}`} style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          color: 'var(--text-main)',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          textDecoration: 'none',
                          transition: 'var(--transition)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--primary)';
                          e.currentTarget.style.backgroundColor = 'var(--primary-light)';
                          e.currentTarget.style.color = 'var(--primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = 'var(--text-main)';
                        }}
                        >
                          <Phone size={14} />
                          <span>{entry.mobile}</span>
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isDeleteOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '24px',
            width: '90%',
            maxWidth: '400px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border)'
          }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>
              Confirm Removal
            </h4>
            <p style={{ margin: '0 0 20px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Are you sure you want to remove vehicle <strong>{vehicleToDelete}</strong> from your profile?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <FormButton onClick={() => setIsDeleteOpen(false)} variant="secondary">
                Cancel
              </FormButton>
              <FormButton onClick={confirmRemoveVehicle} variant="accent">
                Remove
              </FormButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
