import { useState, useEffect, useRef } from 'react';
import { Receipt, Plus, Trash2, Percent, Users, Download, Link2, Check } from 'lucide-react';
import html2canvas from 'html2canvas';

interface Item {
  id: number;
  name: string;
  price: number;
  person: string;
}

interface SharedItem {
  id: number;
  name: string;
  price: number;
  sharedBy: string[];
}

interface PersonTotal {
  items: Item[];
  sharedItems: { name: string; price: number; share: number }[];
  subtotal: number;
  sharedSubtotal: number;
  serviceCharge: number;
  total: number;
}

export default function BillSplitter() {
  const [items, setItems] = useState<Item[]>([]);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [personName, setPersonName] = useState('');
  const [serviceChargeValue, setServiceChargeValue] = useState('');
  const [serviceChargeType, setServiceChargeType] = useState('fixed'); // 'fixed' or 'percent'
  const [currency, setCurrency] = useState('$');
  
  // Shared items state
  const [sharedItems, setSharedItems] = useState<SharedItem[]>([]);
  const [sharedItemName, setSharedItemName] = useState('');
  const [sharedItemPrice, setSharedItemPrice] = useState('');
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  
  // Share functionality state
  const [copied, setCopied] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const currencies = ['$', '€', '£', '¥', '₱', '₹', 'Rs', 'RM', 'S$', 'A$', 'C$', 'CHF', 'kr', 'R'];

  // Load state from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const data = params.get('data');
    if (data) {
      try {
        // Decode URL-safe base64 with Unicode support
        const decoded = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(data)))));
        setItems(decoded.items || []);
        setSharedItems(decoded.sharedItems || []);
        setServiceChargeValue(decoded.serviceChargeValue || '');
        setServiceChargeType(decoded.serviceChargeType || 'fixed');
        setCurrency(decoded.currency || '$');
      } catch (error) {
        console.error('Failed to load shared data:', error);
      }
    }
  }, []);

  const exportAsImage = async () => {
    if (!resultsRef.current) return;
    
    try {
      // Create a wrapper with padding for better capture
      const wrapper = document.createElement('div');
      wrapper.style.padding = '20px';
      wrapper.style.backgroundColor = '#ffffff';
      wrapper.style.position = 'absolute';
      wrapper.style.left = '-9999px';
      wrapper.style.width = `${resultsRef.current.offsetWidth}px`;
      
      // Clone the content
      const clone = resultsRef.current.cloneNode(true) as HTMLElement;
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);
      
      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(wrapper, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
      });
      
      // Clean up
      document.body.removeChild(wrapper);
      
      const link = document.createElement('a');
      link.download = `kkb-calculator-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to export image:', error);
      alert('Failed to export image. Please try again.');
    }
  };

  const shareLink = async () => {
    try {
      const state = {
        items,
        sharedItems,
        serviceChargeValue,
        serviceChargeType,
        currency,
      };
      
      // Use encodeURIComponent to handle Unicode characters properly
      const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(state)))));
      const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`;
      
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback: show the URL in a prompt
      try {
        const state = {
          items,
          sharedItems,
          serviceChargeValue,
          serviceChargeType,
          currency,
        };
        const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(state)))));
        const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`;
        prompt('Copy this link:', url);
      } catch (e) {
        alert('Failed to create share link. Please try again.');
      }
    }
  };

  const addItem = () => {
    if (itemName.trim() && itemPrice && personName.trim()) {
      setItems([...items, { 
        id: Date.now(), 
        name: itemName.trim(), 
        price: parseFloat(itemPrice),
        person: personName.trim()
      }]);
      setItemName('');
      setItemPrice('');
    }
  };

  const removeItem = (id: number) => {
    setItems(items.filter(item => item.id !== id));
  };

  const addSharedItem = () => {
    if (sharedItemName.trim() && sharedItemPrice && selectedPeople.length > 0) {
      setSharedItems([...sharedItems, {
        id: Date.now(),
        name: sharedItemName.trim(),
        price: parseFloat(sharedItemPrice),
        sharedBy: [...selectedPeople]
      }]);
      setSharedItemName('');
      setSharedItemPrice('');
      setSelectedPeople([]);
    }
  };

  const removeSharedItem = (id: number) => {
    setSharedItems(sharedItems.filter(item => item.id !== id));
  };

  const togglePersonSelection = (person: string) => {
    setSelectedPeople(prev => 
      prev.includes(person) 
        ? prev.filter(p => p !== person)
        : [...prev, person]
    );
  };

  const toggleSelectAll = () => {
    const uniquePeople = [...new Set(items.map(item => item.person))];
    if (selectedPeople.length === uniquePeople.length) {
      setSelectedPeople([]);
    } else {
      setSelectedPeople(uniquePeople);
    }
  };

  const calculateByPerson = () => {
    const uniquePeople = [...new Set(items.map(item => item.person))];
    const grandSubtotal = items.reduce((sum, item) => sum + item.price, 0);
    const sharedSubtotal = sharedItems.reduce((sum, item) => sum + item.price, 0);
    const totalSubtotal = grandSubtotal + sharedSubtotal;
    
    let totalServiceCharge = 0;
    
    if (serviceChargeType === 'percent') {
      const servicePercent = parseFloat(serviceChargeValue) || 0;
      totalServiceCharge = totalSubtotal * (servicePercent / 100);
    } else {
      totalServiceCharge = parseFloat(serviceChargeValue) || 0;
    }
    
    const personTotals: Record<string, PersonTotal> = {};
    
    uniquePeople.forEach(person => {
      const personItems = items.filter(item => item.person === person);
      const subtotal = personItems.reduce((sum, item) => sum + item.price, 0);
      
      // Calculate shared items for this person
      const personSharedItems = sharedItems
        .filter(item => item.sharedBy.includes(person))
        .map(item => ({
          name: item.name,
          price: item.price,
          share: item.price / item.sharedBy.length
        }));
      
      const sharedSubtotal = personSharedItems.reduce((sum, item) => sum + item.share, 0);
      const personTotal = subtotal + sharedSubtotal;
      
      // Calculate this person's share of service charge based on their proportion of the bill
      const personServiceCharge = totalSubtotal > 0 
        ? (personTotal / totalSubtotal) * totalServiceCharge 
        : 0;
      
      personTotals[person] = {
        items: personItems,
        sharedItems: personSharedItems,
        subtotal,
        sharedSubtotal,
        serviceCharge: personServiceCharge,
        total: personTotal + personServiceCharge
      };
    });
    
    const grandTotal = totalSubtotal + totalServiceCharge;
    
    return { personTotals, grandSubtotal: totalSubtotal, totalServiceCharge, grandTotal };
  };

  const { personTotals, grandSubtotal, totalServiceCharge, grandTotal } = calculateByPerson();

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addItem();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-red-50 to-yellow-100 p-3 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">
          <div className="flex items-center justify-center mb-4 sm:mb-6 gap-0">
            <img src="/kkb-appicon-final.png" alt="KKB" className="w-24 h-24 sm:w-30 sm:h-30 object-contain flex-shrink-0" />
            <div className="flex flex-col">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">KKB Calculator</h1>
              <p className="text-xs sm:text-sm text-gray-600 italic">Kanya-Kanyang Bayad</p>
            </div>
          </div>

          {/* Currency Selector */}
          <div className="mb-4 sm:mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-sm sm:text-base"
            >
              {currencies.map(curr => (
                <option key={curr} value={curr}>{curr}</option>
              ))}
            </select>
          </div>

          {/* Add Item Section */}
          <div className="mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">Add Items</h2>
            <div className="flex gap-2 flex-wrap mb-4">
              <input
                type="text"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Person name"
                className="flex-1 min-w-[120px] px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Item name"
                className="flex-1 min-w-[120px] px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <div className="relative w-28 sm:w-32">
                <span className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium text-sm sm:text-base">
                  {currency}
                </span>
                <input
                  type="number"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full pl-6 sm:pl-8 pr-2 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <button
                onClick={addItem}
                className="px-3 sm:px-4 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Service Charge */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Service Charge Type
                </label>
                <select
                  value={serviceChargeType}
                  onChange={(e) => setServiceChargeType(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                >
                  <option value="fixed">Fixed Amount</option>
                  <option value="percent">Percentage</option>
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  {serviceChargeType === 'fixed' ? 'Service Charge Amount' : 'Service Charge (%)'}
                </label>
                <div className="relative">
                  {serviceChargeType === 'fixed' ? (
                    <span className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium text-sm sm:text-base">
                      {currency}
                    </span>
                  ) : (
                    <Percent className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  )}
                  <input
                    type="number"
                    value={serviceChargeValue}
                    onChange={(e) => setServiceChargeValue(e.target.value)}
                    placeholder="0"
                    step={serviceChargeType === 'fixed' ? '0.01' : '0.1'}
                    className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Items List */}
          {items.length > 0 && (
            <div className="mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">Individual Items</h3>
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-gray-50 p-2 sm:p-3 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm sm:text-base text-gray-800 font-medium">{item.person}</span>
                      <span className="text-gray-500 mx-1 sm:mx-2">•</span>
                      <span className="text-sm sm:text-base text-gray-700 truncate">{item.name}</span>
                    </div>
                    <span className="text-sm sm:text-base text-gray-700 font-medium mr-2 sm:mr-3 whitespace-nowrap">
                      {currency}{item.price.toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shared Items Section */}
          {Object.keys(personTotals).length > 0 && (
            <div className="mb-4 sm:mb-6 border-t pt-4 sm:pt-6">
              <div className="flex items-center mb-2 sm:mb-3">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 mr-2" />
                <h2 className="text-base sm:text-lg font-semibold text-gray-700">Add Shared Items</h2>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="text"
                    value={sharedItemName}
                    onChange={(e) => setSharedItemName(e.target.value)}
                    placeholder="Shared item name"
                    className="flex-1 min-w-[150px] px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                  <div className="relative w-28 sm:w-32">
                    <span className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium text-sm sm:text-base">
                      {currency}
                    </span>
                    <input
                      type="number"
                      value={sharedItemPrice}
                      onChange={(e) => setSharedItemPrice(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      className="w-full pl-6 sm:pl-8 pr-2 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <button
                    onClick={addSharedItem}
                    disabled={selectedPeople.length === 0}
                    className="px-3 sm:px-4 py-2 sm:py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* People selector */}
                <div className="bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <label className="text-xs sm:text-sm font-medium text-gray-700">
                      Split between:
                    </label>
                    <button
                      onClick={toggleSelectAll}
                      className="text-xs sm:text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      {selectedPeople.length === Object.keys(personTotals).length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(personTotals).map(person => (
                      <button
                        key={person}
                        onClick={() => togglePersonSelection(person)}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg border-2 transition-colors ${
                          selectedPeople.includes(person)
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-red-400'
                        }`}
                      >
                        {person}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Shared Items List */}
              {sharedItems.length > 0 && (
                <div className="mt-3 sm:mt-4">
                  <h3 className="text-sm sm:text-md font-semibold text-gray-700 mb-2">Shared Items</h3>
                  <div className="space-y-2">
                    {sharedItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start sm:items-center justify-between bg-red-50 p-2 sm:p-3 rounded-lg border border-red-200"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <span className="text-sm sm:text-base text-gray-700 font-medium block sm:inline">{item.name}</span>
                          <span className="text-gray-500 mx-2 hidden sm:inline">•</span>
                          <span className="text-xs sm:text-sm text-gray-600 block sm:inline">
                            Split: {item.sharedBy.join(', ')}
                          </span>
                        </div>
                        <span className="text-sm sm:text-base text-gray-700 font-medium mr-2 sm:mr-3 whitespace-nowrap">
                          {currency}{item.price.toFixed(2)}
                        </span>
                        <button
                          onClick={() => removeSharedItem(item.id)}
                          className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results by Person */}
          {Object.keys(personTotals).length > 0 && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-700">Split by Person</h3>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={exportAsImage}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    title="Export as Image"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Image</span>
                  </button>
                  <button
                    onClick={shareLink}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    title="Share Link"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Link2 className="w-4 h-4" />
                        <span>Share Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <div ref={resultsRef} className="space-y-3 sm:space-y-4">
              {Object.entries(personTotals).map(([person, data]) => (
                <div key={person} className="bg-blue-50 rounded-lg p-3 sm:p-5 border-2 border-blue-200">
                  <h4 className="text-base sm:text-lg font-bold text-blue-900 mb-2 sm:mb-3">{person}</h4>
                  
                  {/* Individual items */}
                  {data.items.length > 0 && (
                    <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3">
                      <div className="text-xs font-semibold text-gray-500 uppercase">Individual Items</div>
                      {data.items.map((item: Item) => (
                        <div key={item.id} className="flex justify-between text-xs sm:text-sm text-gray-600">
                          <span className="mr-2 break-words flex-1">{item.name}</span>
                          <span className="whitespace-nowrap flex-shrink-0">{currency}{item.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Shared items */}
                  {data.sharedItems.length > 0 && (
                    <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3 pb-2 sm:pb-3 border-b border-blue-200">
                      <div className="text-xs font-semibold text-red-600 uppercase flex items-center">
                        <Users className="w-3 h-3 mr-1" />
                        Shared Items
                      </div>
                      {data.sharedItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs sm:text-sm text-gray-600">
                          <span className="mr-2 break-words flex-1">{item.name} <span className="text-xs text-gray-500">(split)</span></span>
                          <span className="whitespace-nowrap flex-shrink-0">{currency}{item.share.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="border-t border-blue-300 pt-2 sm:pt-3 space-y-1.5 sm:space-y-2">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-700">Individual Subtotal:</span>
                      <span className="text-gray-800 font-medium">{currency}{data.subtotal.toFixed(2)}</span>
                    </div>
                    {data.sharedSubtotal > 0 && (
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-700">Shared Subtotal:</span>
                        <span className="text-gray-800 font-medium">{currency}{data.sharedSubtotal.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-700">Service Charge:</span>
                      <span className="text-gray-800 font-medium">{currency}{data.serviceCharge.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-blue-300 pt-2">
                      <span className="text-base sm:text-lg font-semibold text-blue-900">Total:</span>
                      <span className="text-lg sm:text-xl font-bold text-blue-600">{currency}{data.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Grand Total */}
              <div className="bg-gray-800 rounded-lg p-3 sm:p-5 text-white">
                <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                  <span className="text-xs sm:text-base text-gray-300">Total Bill (Subtotal):</span>
                  <span className="text-sm sm:text-base font-medium">{currency}{grandSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2 sm:mb-3">
                  <span className="text-xs sm:text-base text-gray-300">Total Service Charge:</span>
                  <span className="text-sm sm:text-base font-medium">{currency}{totalServiceCharge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-600 pt-2 sm:pt-3">
                  <span className="text-base sm:text-xl font-bold">Grand Total:</span>
                  <span className="text-xl sm:text-2xl font-bold">{currency}{grandTotal.toFixed(2)}</span>
                </div>
              </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs sm:text-sm text-gray-600">
            Developed by <a href="https://github.com/helrouis" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:text-blue-800 transition-colors">Helrouis@Innomen Productions</a>
          </p>
        </div>
      </div>
    </div>
  );
}
