import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const colors = ['purple', 'blue', 'teal', 'pink', 'orange'];

export default function CreateGroupDialog({ open, onOpenChange, onSubmit, userEmail, isLoading }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    members: [userEmail],
    color: 'purple',
  });
  const [newMemberEmail, setNewMemberEmail] = useState('');

  const handleAddMember = () => {
    if (newMemberEmail && !formData.members.includes(newMemberEmail)) {
      setFormData(prev => ({
        ...prev,
        members: [...prev.members, newMemberEmail]
      }));
      setNewMemberEmail('');
    }
  };

  const handleRemoveMember = (email) => {
    if (email === userEmail) return; // Can't remove self
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter(m => m !== email)
    }));
  };

  const handleSubmit = () => {
    if (formData.name && formData.members.length > 0) {
      onSubmit(formData);
      setFormData({
        name: '',
        description: '',
        members: [userEmail],
        color: 'purple',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              placeholder="Weekend Trip, Roommates, etc."
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="What's this group for?"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>

          <div>
            <Label>Color Theme</Label>
            <div className="flex gap-2 mt-2">
              {colors.map(color => (
                <button
                  key={color}
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`w-8 h-8 rounded-full bg-gradient-to-br from-${color}-500 to-${color}-600 ${
                    formData.color === color ? 'ring-2 ring-offset-2 ring-gray-900' : ''
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <Label>Members</Label>
            <div className="flex gap-2 mt-2 mb-2">
              <Input
                placeholder="Enter email address"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddMember()}
              />
              <Button onClick={handleAddMember} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.members.map(email => (
                <Badge key={email} variant="secondary" className="pr-1">
                  {email}
                  {email !== userEmail && (
                    <button
                      onClick={() => handleRemoveMember(email)}
                      className="ml-2 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.name || isLoading}
            className="bg-gradient-to-r from-purple-500 to-teal-500 text-white"
          >
            Create Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}